import mongoose from "mongoose";
import Exam from "./Exam.model.js";
import { CalendarEvent } from "../calendar/calendar.model.js";
import Result from "../result/result.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { createAutomatedAcademicNotice } from "../notice/noticeAutomation.service.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import {NotFoundError,ConflictError,BadRequestError,ForbiddenError,
} from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { assertClassSectionExists, buildClassSectionKey } from "../../utils/classSection.util.js";
import { ensureActiveTeacher } from "../../utils/teacher.util.js";
import { createAuditLog } from "../audit/audit.service.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";

let transactionSupportCache = null;

// ═══════════════════════════════════════════════════════════════
// Helper — Validate teacher has access to a class
// ═══════════════════════════════════════════════════════════════

const assertExamAssignedTeachersAreActive = async (schoolId, schedule = []) => {
    const teacherIds = [
        ...new Set(
            (Array.isArray(schedule) ? schedule : [])
                .map((item) => item?.assignedTeacher)
                .filter(Boolean)
                .map((teacherId) => String(teacherId))
        ),
    ];

    if (teacherIds.length === 0) {
        return;
    }

    await Promise.all(
        teacherIds.map((teacherId) =>
            ensureActiveTeacher(schoolId, teacherId, {
                message: "Assigned teacher is archived or unavailable for this exam",
            })
        )
    );
};

const isExamCreator = (exam, user) =>
    String(exam?.createdBy?._id || exam?.createdBy || "") === String(user?._id || "");

const canManageExam = (exam, user) =>
    [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role) || isExamCreator(exam, user);

const isTeacherAssignedToExamClass = (assignedClasses = [], exam = {}) => {
    const examClassKey = buildClassSectionKey(exam.standard, exam.section);

    return (Array.isArray(assignedClasses) ? assignedClasses : []).some((item) =>
        buildClassSectionKey(item?.standard, item?.section) === examClassKey
    );
};

const buildTeacherExamScope = async (schoolId, userId) => {
    const profile = await TeacherProfile.findOne({ schoolId, userId })
        .select("assignedClasses")
        .lean();

    const classScope = Array.isArray(profile?.assignedClasses) ? profile.assignedClasses : [];
    const scopeClauses = classScope
        .map((item) => {
            const standard = String(item?.standard || "").trim();
            const section = String(item?.section || "").trim().toUpperCase();

            if (!standard || !section) {
                return null;
            }

            return { standard, section };
        })
        .filter(Boolean);

    return {
        classScope,
        scopeClauses,
    };
};

const assertCanManageExam = (
    exam,
    user,
    message = "Only the exam creator or an admin can modify this exam"
) => {
    if (canManageExam(exam, user)) {
        return;
    }

    throw new ForbiddenError(message);
};

const buildCreatorSnapshot = (user, standard, section) => ({
    name: user?.name || "Staff",
    role: user?.role || "admin",
    classLabel:
        user?.role === USER_ROLES.TEACHER
            ? `Class ${standard}-${section}`
            : null,
});

const normalizeDocumentType = (file = {}) => {
    const originalName = file.originalname || file.name || "";
    const extension = originalName.includes(".")
        ? originalName.split(".").pop().toLowerCase()
        : "";

    if (file.mimetype === "application/pdf" || extension === "pdf") return "pdf";
    if (file.mimetype === "image/jpeg" || extension === "jpg" || extension === "jpeg") return "jpeg";
    if (file.mimetype === "image/png" || extension === "png") return "png";
    if (file.mimetype === "application/vnd.ms-powerpoint" || extension === "ppt") return "ppt";
    if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        extension === "pptx"
    ) return "pptx";
    if (file.mimetype === "application/msword" || extension === "doc") return "doc";
    if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        extension === "docx"
    ) return "docx";
    if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        extension === "xlsx"
    ) return "xlsx";
    if (file.mimetype === "application/vnd.ms-excel" || extension === "xls") return "xls";
    if (file.mimetype === "text/csv" || extension === "csv") return "csv";
    if (file.mimetype === "application/rtf" || extension === "rtf") return "rtf";
    if (file.mimetype === "text/plain" || extension === "txt") return "txt";
    if (file.mimetype === "application/vnd.oasis.opendocument.text" || extension === "odt") return "odt";

    return extension || (file.mimetype ? file.mimetype.split("/").pop() : null);
};

const mapSyllabusDocument = (file = {}) => {
    const originalName = file.originalname || file.name || "document";

    return {
        url: file.path || file.secure_url,
        publicId: file.filename || file.public_id,
        name: originalName,
        originalName,
        fileType: normalizeDocumentType(file),
        mimeType: file.mimetype || null,
        size: Number.isFinite(file.size) ? file.size : null,
        uploadedAt: new Date(),
    };
};

const getScheduleAttachmentUrls = (schedule = []) => {
    if (!Array.isArray(schedule)) {
        return [];
    }

    return schedule.flatMap((item) =>
        (Array.isArray(item?.attachments) ? item.attachments : [])
            .map((attachment) => attachment?.url)
            .filter(Boolean)
    );
};

const formatNoticeDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const formatAttachmentEntry = (attachment) =>
    attachment?.name || attachment?.originalName || "Attachment";

const buildNoticeAttachment = (attachment, scheduleItem, index) => {
    const fileUrl = attachment?.url || attachment?.secure_url || attachment?.path;
    if (!fileUrl) {
        return null;
    }

    return {
        filename: attachment?.publicId || attachment?.public_id || attachment?.filename,
        originalName: attachment?.name || attachment?.originalName || `Attachment ${index + 1}`,
        path: fileUrl,
        secure_url: fileUrl,
        public_id: attachment?.publicId || attachment?.public_id || attachment?.filename,
        size: Number.isFinite(attachment?.size) ? attachment.size : undefined,
        mimetype: attachment?.mimeType || attachment?.mimetype,
        label: scheduleItem?.subject || undefined,
    };
};

const getExamNoticeAttachments = (schedule = []) =>
    (Array.isArray(schedule) ? schedule : []).flatMap((item) =>
        (Array.isArray(item?.attachments) ? item.attachments : [])
            .map((attachment, index) => buildNoticeAttachment(attachment, item, index))
            .filter(Boolean)
    );

const buildExamNoticeTitle = (exam, isUpdate) => {
    const classLabel = `${exam.standard}-${exam.section}`;
    return isUpdate
        ? `Exam Updated: ${exam.name} (${classLabel})`
        : `Exam Published: ${exam.name} (${classLabel})`;
};

const buildExamNoticeMessage = (exam, { isUpdate = false, changedByName = "Staff" } = {}) => {
    const schedule = Array.isArray(exam?.schedule) ? exam.schedule : [];
    const heading = isUpdate
        ? `${changedByName} updated exam syllabus/attachments.`
        : "A new exam schedule has been published.";

    const lines = schedule.map((item, index) => {
        const timeRange = item?.startTime || item?.endTime
            ? `${item?.startTime || "N/A"} - ${item?.endTime || "N/A"}`
            : "N/A";
        const attachmentsText = Array.isArray(item?.attachments) && item.attachments.length
            ? item.attachments.map(formatAttachmentEntry).join("; ")
            : "None";

        return [
            `${index + 1}. Subject: ${item?.subject || "N/A"}`,
            `   Date: ${formatNoticeDate(item?.examDate)}`,
            `   Time: ${timeRange}`,
            `   Total Marks: ${item?.totalMarks ?? "N/A"} | Passing Marks: ${item?.passingMarks ?? 0}`,
            `   Syllabus: ${item?.syllabus || "Not specified"}`,
            `   Attachments: ${attachmentsText}`,
        ].join("\n");
    });

    return [
        heading,
        `Exam: ${exam?.name || "N/A"}`,
        `Class: ${exam?.standard || "N/A"}-${exam?.section || "N/A"}`,
        `Academic Year: ${exam?.academicYear || "N/A"}`,
        "",
        "Paper Details:",
        lines.length ? lines.join("\n\n") : "No paper details available.",
    ].join("\n");
};

const createExamNoticeBroadcast = async (schoolId, exam, actorUser, { isUpdate = false } = {}) => {
    const createdBy = actorUser?._id || exam.createdBy;
    const changedByName = actorUser?.name || "Staff";
    const title = buildExamNoticeTitle(exam, isUpdate);
    const message = buildExamNoticeMessage(exam, { isUpdate, changedByName });
    const attachments = getExamNoticeAttachments(exam.schedule);
    const subjects = (Array.isArray(exam?.schedule) ? exam.schedule : [])
        .map((item) => item?.subject)
        .filter(Boolean);

    return createAutomatedAcademicNotice({
        schoolId,
        createdBy,
        title,
        message,
        sourceType: "exam",
        sourceId: exam._id,
        noticeCategory: isUpdate ? "exam_updated" : "exam_published",
        classContext: {
            standard: exam.standard,
            section: exam.section,
            academicYear: exam.academicYear,
        },
        subjects,
        attachments,
    });
};

const createExamCreatedNoticeForAdmins = async (schoolId, exam, actorUser) => {
    const createdBy = actorUser?._id || exam.createdBy;
    const actorName = actorUser?.name || "Staff";
    const classLabel = `${exam.standard}-${exam.section}`;

    return createAutomatedAcademicNotice({
        schoolId,
        createdBy,
        title: `Exam Created: ${exam.name} (${classLabel})`,
        message: [
            `${actorName} created a new exam entry.`,
            `Exam: ${exam.name}`,
            `Class: ${classLabel}`,
            `Academic Year: ${exam.academicYear || "N/A"}`,
            `Current Status: ${exam.status || "DRAFT"}`,
        ].join("\n"),
        sourceType: "exam",
        sourceId: exam._id,
        noticeCategory: "exam_created",
        classContext: {
            standard: exam.standard,
            section: exam.section,
            academicYear: exam.academicYear,
        },
        subjects: [],
        audience: {
            includeClassTeacher: false,
            includeSubjectTeachers: false,
            includeAdmins: true,
            includeStudents: false,
        },
    });
};

const validatePublishedExamSchedule = (schedule = []) => {
    if (!Array.isArray(schedule) || schedule.length === 0) {
        throw new BadRequestError("Cannot publish an exam without at least one schedule entry");
    }
};

const supportsMongoTransactions = async () => {
    if (transactionSupportCache !== null) {
        return transactionSupportCache;
    }

    try {
        const admin = mongoose.connection?.db?.admin?.();
        if (!admin) {
            transactionSupportCache = false;
            return transactionSupportCache;
        }

        const hello = await admin.command({ hello: 1 });
        transactionSupportCache = Boolean(hello?.setName || hello?.msg === "isdbgrid");
        return transactionSupportCache;
    } catch (error) {
        logger.warn(`Could not determine Mongo transaction support: ${error.message}`);
        transactionSupportCache = false;
        return transactionSupportCache;
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE EXAM — Unified for admin (TERM_EXAM) & teacher (CLASS_TEST)
// ═══════════════════════════════════════════════════════════════

export const createExam = async (schoolId, data, user) => {
    const activeSchoolId = schoolId || data.schoolId;
    if (!activeSchoolId) throw new BadRequestError("School ID is required");

    const standards = Array.isArray(data.standard) ? data.standard : [data.standard];
    const sections = Array.isArray(data.section) ? data.section : [data.section];

    if (standards.length === 0 || sections.length === 0) {
        throw new BadRequestError("At least one class and section must be selected");
    }

    if (data.status === "PUBLISHED") {
        validatePublishedExamSchedule(data.schedule);
    }

    // Validate teachers once for the shared schedule
    await assertExamAssignedTeachersAreActive(activeSchoolId, data.schedule);

    const useTransactions = await supportsMongoTransactions();
    const session = useTransactions ? await mongoose.startSession() : null;
    if (session) {
        session.startTransaction();
    }
    let createdExams = [];

    try {
        const exams = [];

        for (const standard of standards) {
            for (const section of sections) {
                const normalized = await assertClassSectionExists(
                    activeSchoolId,
                    standard,
                    section,
                    { message: `Class ${standard}-${section} is not configured` }
                );

                const activeConflictQuery = Exam.findOne({
                    schoolId: activeSchoolId,
                    name: data.name,
                    academicYear: data.academicYear,
                    standard: normalized.standard,
                    section: normalized.section,
                    examType: data.examType,
                    status: { $in: ["DRAFT", "PUBLISHED"] },
                    isActive: true,
                }).lean();

                if (session) {
                    activeConflictQuery.session(session);
                }

                const activeConflict = await activeConflictQuery;

                if (activeConflict) {
                    throw new ConflictError(
                        `An active exam "${data.name}" already exists for ${standard}-${section}`
                    );
                }

                const createData = {
                    ...data,
                    schoolId: activeSchoolId,
                    standard: normalized.standard,
                    section: normalized.section,
                    createdBy: user._id,
                    createdByRole: user.role,
                    creatorSnapshot: buildCreatorSnapshot(user, normalized.standard, normalized.section),
                };

                const [exam] = session
                    ? await Exam.create([createData], { session })
                    : await Exam.create([createData]);
                await syncExamCalendarEvents(exam, activeSchoolId);
                exams.push(exam);
            }
        }

        if (session) {
            await session.commitTransaction();
        }
        createdExams = exams;
        logger.info(`Bulk Exam created: ${exams.length} exams for "${data.name}" across ${standards.length} classes and ${sections.length} sections`);

        if (data.status === "PUBLISHED") {
            await Promise.allSettled(
                createdExams.map((exam) => createExamNoticeBroadcast(activeSchoolId, exam, user, { isUpdate: false }))
            );
        }

        await Promise.allSettled(
            createdExams.map((exam) => createExamCreatedNoticeForAdmins(activeSchoolId, exam, user))
        );

        return exams[0]; // Return the first one for the frontend to handle completion
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// GET EXAMS — Auto-filtered by role
// ═══════════════════════════════════════════════════════════════

export const getExams = async (schoolId, filters = {}, user) => {
    const summaryQuery = { isActive: true };
    if (schoolId) summaryQuery.schoolId = schoolId;

    // Super Admin can filter by schoolId from params if not in context
    if (user.role === USER_ROLES.SUPER_ADMIN && !schoolId && filters.schoolId) {
        summaryQuery.schoolId = filters.schoolId;
    }

    // Apply filters
    if (filters.examType) summaryQuery.examType = filters.examType;
    if (filters.academicYear) summaryQuery.academicYear = Number(filters.academicYear);
    if (filters.standard) summaryQuery.standard = filters.standard;
    if (filters.section) summaryQuery.section = filters.section;

    if (user.role === USER_ROLES.TEACHER) {
        const { scopeClauses } = await buildTeacherExamScope(summaryQuery.schoolId, user._id);
        summaryQuery.$or = scopeClauses.length > 0
            ? [{ createdBy: user._id }, ...scopeClauses]
            : [{ createdBy: user._id }];
    }

    const query = { ...summaryQuery };
    if (filters.status) query.status = filters.status;

    const page = Math.max(0, Number(filters.page) || 0);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));

    const [totalCount, totalAcrossFilters, upcomingCount, completedCount, draftCount, exams] = await Promise.all([
        Exam.countDocuments(query),
        Exam.countDocuments(summaryQuery),
        Exam.countDocuments({ ...summaryQuery, status: "PUBLISHED" }),
        Exam.countDocuments({ ...summaryQuery, status: "COMPLETED" }),
        Exam.countDocuments({ ...summaryQuery, status: "DRAFT" }),
        Exam.find(query)
            .populate("createdBy", "name email isArchived")
            .populate("schedule.assignedTeacher", "name email isArchived")
            .sort({ createdAt: -1 })
            .skip(page * pageSize)
            .limit(pageSize)
            .lean(),
    ]);

    return {
        exams,
        pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
            total: totalAcrossFilters,
            upcoming: upcomingCount,
            completed: completedCount,
            drafts: draftCount,
        },
    };
};

// ═══════════════════════════════════════════════════════════════
// GET EXAM BY ID — With role-based access check
// ═══════════════════════════════════════════════════════════════

export const getExamById = async (schoolId, examId, user) => {
    const query = { _id: examId, isActive: true };
    if (schoolId) query.schoolId = schoolId;

    const exam = await Exam.findOne(query)
        .populate("createdBy", "name email isArchived")
        .populate("schedule.assignedTeacher", "name email isArchived")
        .lean();

    if (!exam) throw new NotFoundError("Exam not found");

    if (user?.role === USER_ROLES.TEACHER) {
        const { classScope } = await buildTeacherExamScope(schoolId, user._id);
        const canAccessExam =
            isExamCreator(exam, user) || isTeacherAssignedToExamClass(classScope, exam);

        if (!canAccessExam) {
            throw new ForbiddenError("You do not have access to this exam");
        }
    }

    return exam;
};

// ═══════════════════════════════════════════════════════════════
// UPDATE EXAM — Admin for term exams, teacher for own class tests
// ═══════════════════════════════════════════════════════════════

export const updateExam = async (schoolId, examId, data, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    assertCanManageExam(exam, user, "Only the exam creator or an admin can update this exam");
    const previousStatus = exam.status;

    // Apply safe updates (don't allow changing examType, standard, section, academicYear)
    if (data.schedule !== undefined) {
        await assertExamAssignedTeachersAreActive(schoolId, data.schedule);
    }

    const previousScheduleAttachmentUrls = getScheduleAttachmentUrls(exam.schedule);

    if (data.name !== undefined) exam.name = data.name;
    if (data.category !== undefined) exam.category = data.category;
    if (data.categoryDescription !== undefined)
        exam.categoryDescription = data.categoryDescription;
    if (data.description !== undefined) exam.description = data.description;
    if (data.schedule !== undefined) exam.schedule = data.schedule;
    if (data.status !== undefined) exam.status = data.status;

    if (exam.status === "PUBLISHED") {
        validatePublishedExamSchedule(exam.schedule);
    }

    await exam.save();
    await syncExamCalendarEvents(exam, schoolId);

    if (data.schedule !== undefined) {
        const nextScheduleAttachmentUrls = new Set(getScheduleAttachmentUrls(exam.schedule));
        const removedAttachmentUrls = previousScheduleAttachmentUrls.filter(
            (url) => !nextScheduleAttachmentUrls.has(url)
        );

        if (removedAttachmentUrls.length > 0) {
            await Promise.allSettled(
                removedAttachmentUrls.map((url) => deleteFromCloudinary(url))
            );
        }
    }

    const hasJustPublished = previousStatus !== "PUBLISHED" && exam.status === "PUBLISHED";
    if (hasJustPublished) {
        try {
            await createExamNoticeBroadcast(schoolId, exam, user, { isUpdate: false });
        } catch (noticeError) {
            logger.error(`Failed to broadcast exam publish notice for ${examId}: ${noticeError.message}`);
        }
    } else if (exam.status === "PUBLISHED" && data.schedule !== undefined) {
        try {
            await createExamNoticeBroadcast(schoolId, exam, user, { isUpdate: true });
        } catch (noticeError) {
            logger.error(`Failed to broadcast exam update notice for ${examId}: ${noticeError.message}`);
        }
    }

    logger.info(`Exam updated: ${examId}`);
    return exam;
};

export const uploadSyllabusDocument = async (schoolId, examId, file, user) => {
    if (!file) {
        throw new BadRequestError("Syllabus document file is required");
    }

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    assertCanManageExam(exam, user, "Only the exam creator or an admin can update this exam");

    const nextDocument = mapSyllabusDocument(file);
    if (!nextDocument.url) {
        throw new BadRequestError("Unable to process syllabus document");
    }

    const previousDocumentUrl = exam.syllabusDocument?.url;
    exam.syllabusDocument = nextDocument;
    await exam.save();

    if (previousDocumentUrl && previousDocumentUrl !== nextDocument.url) {
        await deleteFromCloudinary(previousDocumentUrl);
    }

    logger.info(`Syllabus document uploaded for exam: ${examId}`);
    return exam;
};

export const uploadScheduleAttachments = async (schoolId, examId, scheduleItemId, files, user) => {
    if (!Array.isArray(files) || files.length === 0) {
        throw new BadRequestError("At least one attachment is required");
    }

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    const scheduleItem = exam.schedule.id(scheduleItemId);
    if (!scheduleItem) {
        throw new NotFoundError("Exam schedule item not found");
    }
    assertCanManageExam(exam, user, "Only the exam creator or an admin can update this exam");

    const mappedAttachments = files.map((file) => {
        const mapped = mapSyllabusDocument(file);
        if (!mapped.url) {
            throw new BadRequestError("Unable to process one or more attachment files");
        }
        return mapped;
    });

    const currentAttachments = Array.isArray(scheduleItem.attachments) ? scheduleItem.attachments : [];
    if ((currentAttachments.length + mappedAttachments.length) > 10) {
        throw new BadRequestError("Maximum 10 attachments allowed per exam paper");
    }

    scheduleItem.attachments = [...currentAttachments, ...mappedAttachments];
    await exam.save();
    await syncExamCalendarEvents(exam, schoolId);

    if (exam.status === "PUBLISHED") {
        try {
            await createExamNoticeBroadcast(schoolId, exam, user, { isUpdate: true });
        } catch (noticeError) {
            logger.error(`Failed to broadcast attachment update notice for ${examId}: ${noticeError.message}`);
        }
    }

    logger.info(`Schedule attachments uploaded for exam: ${examId}, schedule item: ${scheduleItemId}`);
    return exam;
};

export const patchScheduleSyllabus = async (schoolId, examId, scheduleItemId, data, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    const scheduleItem = exam.schedule.id(scheduleItemId);
    if (!scheduleItem) {
        throw new NotFoundError("Exam schedule item not found");
    }

    assertCanManageExam(exam, user, "Only the exam creator or an admin can update this exam");

    const previousAttachmentUrls = Array.isArray(scheduleItem.attachments)
        ? scheduleItem.attachments.map((attachment) => attachment?.url).filter(Boolean)
        : [];

    if (data.syllabus !== undefined) {
        scheduleItem.syllabus = data.syllabus;
    }
    if (data.attachments !== undefined) {
        if (Array.isArray(data.attachments) && data.attachments.length > 10) {
            throw new BadRequestError("Maximum 10 attachments allowed per exam paper");
        }
        scheduleItem.attachments = Array.isArray(data.attachments) ? data.attachments : [];
    }

    await exam.save();
    await syncExamCalendarEvents(exam, schoolId);

    if (data.attachments !== undefined) {
        const nextAttachmentUrls = new Set(
            (Array.isArray(scheduleItem.attachments) ? scheduleItem.attachments : [])
                .map((attachment) => attachment?.url)
                .filter(Boolean)
        );
        const removedUrls = previousAttachmentUrls.filter((url) => !nextAttachmentUrls.has(url));
        if (removedUrls.length > 0) {
            await Promise.allSettled(removedUrls.map((url) => deleteFromCloudinary(url)));
        }
    }

    if (!data.suppressNotice && exam.status === "PUBLISHED") {
        try {
            await createExamNoticeBroadcast(schoolId, exam, user, { isUpdate: true });
        } catch (noticeError) {
            logger.error(`Failed to broadcast syllabus update notice for ${examId}: ${noticeError.message}`);
        }
    }

    return exam;
};

// ═══════════════════════════════════════════════════════════════
// DELETE EXAM — Soft delete by default, hard delete for completed exams
// ═══════════════════════════════════════════════════════════════

export const deleteExam = async (schoolId, examId, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    assertCanManageExam(exam, user, "Only the exam creator or an admin can delete this exam");

    const cleanupUrls = [
        ...(exam.syllabusDocument?.url ? [exam.syllabusDocument.url] : []),
        ...getScheduleAttachmentUrls(exam.schedule),
    ];

    if (cleanupUrls.length > 0) {
        await Promise.allSettled(cleanupUrls.map((url) => deleteFromCloudinary(url)));
    }

    await deleteExamCalendarEvents(exam);

    if (exam.status === "COMPLETED") {
        await Result.deleteMany({ schoolId, examId: exam._id });
        await Exam.deleteOne({ _id: exam._id });
        logger.info(`Exam deleted (hard): ${examId}`);
        return;
    }

    exam.isActive = false;
    await exam.save();
    logger.info(`Exam deleted (soft): ${examId}`);
};

// ═══════════════════════════════════════════════════════════════
// UPDATE STATUS — DRAFT→PUBLISHED, PUBLISHED→COMPLETED, →CANCELLED
// ═══════════════════════════════════════════════════════════════

const VALID_TRANSITIONS = {
    DRAFT: ["PUBLISHED", "CANCELLED"],
    PUBLISHED: ["COMPLETED", "CANCELLED"],
};

const buildDateTime = (dateValue, timeValue) => {
    const date = new Date(dateValue);
    if (!timeValue) return date;
    const [hours, minutes] = String(timeValue).split(":").map(Number);
    if (Number.isFinite(hours)) date.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    return date;
};

export const syncExamCalendarEvents = async (exam, schoolId) => {
    const activeSchoolId = schoolId || exam.schoolId;

    await deleteExamCalendarEvents(exam);

    if (!["DRAFT", "PUBLISHED"].includes(exam.status)) {
        return;
    }

    const classKey = `${exam.standard}-${exam.section}`;
    const schedule = Array.isArray(exam.schedule) ? exam.schedule : [];
    
    // Get current date at midnight for "automatic removal" of past items
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = schedule
        .filter((item) => {
            const examDate = new Date(item.examDate);
            examDate.setHours(0, 0, 0, 0);
            return examDate >= today; // Only add future or current exams
        })
        .map((item) => {
            const start = buildDateTime(item.examDate, item.startTime);
            const end = buildDateTime(item.examDate, item.endTime || item.startTime);
            const allDay = !(item.startTime && item.endTime);

            return {
                title: item.subject,
                description: [
                    exam.name ? `Exam: ${exam.name}` : null,
                    `Class: ${classKey}`,
                    item.syllabus || exam.description || null,
                ]
                    .filter(Boolean)
                    .join("\n"),
                start,
                end,
                allDay,
                type: "exam",
                targetAudience: "classes",
                targetClasses: [classKey],
                createdBy: exam.createdBy,
                schoolId: activeSchoolId,
                sourceType: "exam",
                sourceId: exam._id,
                examStatus: exam.status
            };
        });

    if (events.length) {
        await CalendarEvent.insertMany(events);
    }
};

const deleteExamCalendarEvents = async (exam) => {
    const classKey = `${exam.standard}-${exam.section}`;
    const deleted = await CalendarEvent.deleteMany({
        schoolId: exam.schoolId,
        sourceType: "exam",
        sourceId: exam._id
    });

    // Backward-compatible cleanup for older exam calendar events
    if ((deleted?.deletedCount ?? 0) === 0) {
        const legacySubjects = (Array.isArray(exam.schedule) ? exam.schedule : [])
            .map((item) => item?.subject)
            .filter(Boolean);
        const legacyStarts = (Array.isArray(exam.schedule) ? exam.schedule : [])
            .map((item) => buildDateTime(item?.examDate, item?.startTime))
            .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()));

        await CalendarEvent.deleteMany({
            schoolId: exam.schoolId,
            type: "exam",
            targetClasses: [classKey],
            ...(legacySubjects.length > 0 ? { title: { $in: legacySubjects } } : {}),
            ...(legacyStarts.length > 0 ? { start: { $in: legacyStarts } } : {})
        });
    }
};

export const updateStatus = async (schoolId, examId, newStatus, user, metadata) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    assertCanManageExam(exam, user, "Only the exam creator or an admin can change this exam status");

    const allowed = VALID_TRANSITIONS[exam.status];
    if (!allowed || !allowed.includes(newStatus)) {
        throw new BadRequestError(
            `Cannot transition from ${exam.status} to ${newStatus}. Allowed: ${(allowed || []).join(", ") || "none"}`
        );
    }

    // Require at least one schedule item before publishing
    if (newStatus === "PUBLISHED") {
        validatePublishedExamSchedule(exam.schedule);
    }

    const previousStatus = exam.status;

    exam.status = newStatus;
    await exam.save();

    try {
        await syncExamCalendarEvents(exam, schoolId);
    } catch (error) {
        exam.status = previousStatus;
        await exam.save();
        throw error;
    }

    if (newStatus === "PUBLISHED") {
        try {
            await createExamNoticeBroadcast(schoolId, exam, user, { isUpdate: false });
        } catch (noticeError) {
            logger.error(`Failed to broadcast exam publish notice for ${examId}: ${noticeError.message}`);
        }
    }

    logger.info(`Exam status changed: ${examId} → ${newStatus}`);
    // Fire-and-forget audit log
    createAuditLog({
        schoolId,
        action: AUDIT_ACTIONS.EXAM_STATUS_CHANGED,
        actorId: user._id,
        actorRole: user.role,
        targetEntity: "Exam",
        targetId: exam._id,
        details: {
            oldStatus: previousStatus,
            newStatus,
            title: exam.name,
            type: exam.examType,
        },
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
    }).catch(() => {});

    return exam;
};

// ═══════════════════════════════════════════════════════════════
// STUDENT — My Exams (split into termExams + classTests)
// ═══════════════════════════════════════════════════════════════

export const getMyExams = async (schoolId, userId, filters = {}) => {
    const profile = await StudentProfile.findOne({ userId, schoolId }).lean();
    if (!profile) throw new NotFoundError("Student profile not found");

    const query = {
        schoolId,
        standard: profile.standard,
        section: profile.section,
        status: { $in: ["PUBLISHED", "COMPLETED"] },
        isActive: true,
    };

    if (filters.academicYear) query.academicYear = Number(filters.academicYear);

    const exams = await Exam.find(query)
        .populate("createdBy", "name email isArchived")
        .populate("schedule.assignedTeacher", "name email isArchived")
        .sort({ createdAt: -1 })
        .lean();

    // Split into two sections
    const termExams = exams.filter((e) => e.examType === "TERM_EXAM");
    const classTests = exams.filter((e) => e.examType === "CLASS_TEST");

    return { termExams, classTests };
};

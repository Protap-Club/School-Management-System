import Exam from "./Exam.model.js";
import { CalendarEvent } from "../calendar/calendar.model.js";
import Result from "../result/result.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import {
    NotFoundError,
    ConflictError,
    BadRequestError,
    ForbiddenError,
} from "../../utils/customError.js";
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// Helper — Validate teacher has access to a class
// ═══════════════════════════════════════════════════════════════

const assertTeacherClassAccess = async (userId, schoolId, standard, section) => {
    const profile = await TeacherProfile.findOne({ userId, schoolId }).lean();
    if (!profile) throw new ForbiddenError("Teacher profile not found");

    const hasAccess = profile.assignedClasses?.some(
        (c) => c.standard === standard && c.section === section
    );
    if (!hasAccess) {
        throw new ForbiddenError("You can only manage exams for your assigned classes");
    }
    return profile;
};

// ═══════════════════════════════════════════════════════════════
// CREATE EXAM — Unified for admin (TERM_EXAM) & teacher (CLASS_TEST)
// ═══════════════════════════════════════════════════════════════

export const createExam = async (schoolId, data, user) => {
    // Use schoolId from data if not provided (for Super Admin)
    const activeSchoolId = schoolId || data.schoolId;

    if (!activeSchoolId) {
        throw new BadRequestError("School ID is required");
    }

    // Role-based exam type enforcement
    if (user.role === USER_ROLES.TEACHER) {
        if (data.examType !== "CLASS_TEST") {
            throw new ForbiddenError("Teachers can only create CLASS_TEST exams");
        }
        await assertTeacherClassAccess(user._id, activeSchoolId, data.standard, data.section);
    } else if (user.role === USER_ROLES.ADMIN) {
        if (data.examType !== "TERM_EXAM") {
            throw new ForbiddenError("Admins should create TERM_EXAM exams");
        }
    }
    // SUPER_ADMIN has no restrictions on examType

    // Check for duplicate (Only conflict with DRAFT or PUBLISHED exams with same name)
    const activeConflict = await Exam.findOne({
        schoolId: activeSchoolId,
        name: data.name,
        academicYear: data.academicYear,
        standard: data.standard,
        section: data.section,
        examType: data.examType,
        status: { $in: ["DRAFT", "PUBLISHED"] },
        isActive: true,
    }).lean();
    
    if (activeConflict) {
        throw new ConflictError(
            `An active exam "${data.name}" already exists for ${data.standard}-${data.section}. Please complete or cancel it before creating another with the same name.`
        );
    }

    // Prepare create data
    const createData = {
        ...data,
        schoolId: activeSchoolId,
        createdBy: user._id,
        createdByRole: user.role,
    };

    const exam = await Exam.create(createData);

    logger.info(
        `Exam created: ${exam._id} (${exam.examType}: "${exam.name}" for ${exam.standard}-${exam.section})`
    );
    return exam;
};

// ═══════════════════════════════════════════════════════════════
// GET EXAMS — Auto-filtered by role
// ═══════════════════════════════════════════════════════════════

export const getExams = async (schoolId, filters = {}, user) => {
    const query = { isActive: true };
    if (schoolId) query.schoolId = schoolId;

    // Super Admin can filter by schoolId from params if not in context
    if (user.role === USER_ROLES.SUPER_ADMIN && !schoolId && filters.schoolId) {
        query.schoolId = filters.schoolId;
    }

    // Role-based filtering
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({ userId: user._id, schoolId }).lean();

        if (profile?.assignedClasses?.length) {
            const classFilters = profile.assignedClasses.map((c) => ({
                standard: c.standard,
                section: c.section,
            }));
            query.$or = classFilters;
        } else {
            // Fallback: if teacher has no assigned classes, at least show exams they created
            query.createdBy = user._id;
        }
    }

    // Apply filters
    if (filters.examType) query.examType = filters.examType;
    if (filters.academicYear) query.academicYear = Number(filters.academicYear);
    if (filters.standard) query.standard = filters.standard;
    if (filters.section) query.section = filters.section;
    if (filters.status) query.status = filters.status;

    return await Exam.find(query)
        .populate("createdBy", "name email isArchived")
        .populate("schedule.assignedTeacher", "name email isArchived")
        .sort({ createdAt: -1 })
        .lean();
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

    // Access check for teacher
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({ userId: user._id, schoolId }).lean();
        const hasAccess = profile?.assignedClasses?.some(
            (c) => c.standard === exam.standard && c.section === exam.section
        );
        if (!hasAccess) throw new ForbiddenError("You don't have access to this exam");
    }
    // ADMIN and SUPER_ADMIN have full access


    return exam;
};

// ═══════════════════════════════════════════════════════════════
// UPDATE EXAM — Admin for term exams, teacher for own class tests
// ═══════════════════════════════════════════════════════════════

export const updateExam = async (schoolId, examId, data, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    // Permission check
    if (user.role === USER_ROLES.TEACHER) {
        if (exam.examType !== "CLASS_TEST" || String(exam.createdBy) !== String(user._id)) {
            throw new ForbiddenError("You can only update your own class tests");
        }
        await assertTeacherClassAccess(user._id, schoolId, exam.standard, exam.section);
    }
    // Admins and Super Admins can update any exam (term or class test)

    // Can only update DRAFT or PUBLISHED exams (Teachers only restricted for CANCELLED)
    if (user.role === USER_ROLES.TEACHER && exam.status === "CANCELLED") {
        throw new BadRequestError(`Cannot update a cancelled exam`);
    }

    // Apply safe updates (don't allow changing examType, standard, section, academicYear)
    if (data.name !== undefined) exam.name = data.name;
    if (data.category !== undefined) exam.category = data.category;
    if (data.categoryDescription !== undefined)
        exam.categoryDescription = data.categoryDescription;
    if (data.description !== undefined) exam.description = data.description;
    if (data.schedule !== undefined) exam.schedule = data.schedule;
    if (data.status !== undefined) exam.status = data.status;

    await exam.save();
    logger.info(`Exam updated: ${examId}`);
    return exam;
};

// ═══════════════════════════════════════════════════════════════
// DELETE EXAM — Soft delete by default, hard delete for completed exams
// ═══════════════════════════════════════════════════════════════

export const deleteExam = async (schoolId, examId, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    // Permission check
    if (user.role === USER_ROLES.TEACHER) {
        if (exam.examType !== "CLASS_TEST" || String(exam.createdBy) !== String(user._id)) {
            throw new ForbiddenError("You can only delete your own class tests");
        }
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

const createExamCalendarEvents = async (exam, schoolId) => {
    const classKey = `${exam.standard}-${exam.section}`;
    const schedule = Array.isArray(exam.schedule) ? exam.schedule : [];

    const events = schedule.map((item) => {
        const start = buildDateTime(item.examDate, item.startTime);
        const end = buildDateTime(item.examDate, item.endTime || item.startTime);
        const allDay = !(item.startTime && item.endTime);

        return {
            title: item.subject,
            description: item.syllabus || "",
            start,
            end,
            allDay,
            type: "exam",
            targetAudience: "classes",
            targetClasses: [classKey],
            createdBy: exam.createdBy,
            schoolId,
            sourceType: "exam",
            sourceId: exam._id
        };
    });

    if (events.length) {
        await CalendarEvent.insertMany(events);
    }
};

const deleteExamCalendarEvents = async (exam) => {
    const classKey = `${exam.standard}-${exam.section}`;
    const deleted = await CalendarEvent.deleteMany({ sourceType: "exam", sourceId: exam._id });

    // Backward-compatible cleanup for older exam calendar events
    if ((deleted?.deletedCount ?? 0) === 0) {
        await CalendarEvent.deleteMany({
            type: "exam",
            title: exam.name,
            targetClasses: [classKey]
        });
    }
};

export const updateStatus = async (schoolId, examId, newStatus, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    // Permission check
    if (user.role === USER_ROLES.TEACHER) {
        if (exam.examType !== "CLASS_TEST" || String(exam.createdBy) !== String(user._id)) {
            throw new ForbiddenError("You can only change status of your own class tests");
        }
    }
    // Admins and Super Admins can change status of any exam

    const allowed = VALID_TRANSITIONS[exam.status];
    if (!allowed || !allowed.includes(newStatus)) {
        throw new BadRequestError(
            `Cannot transition from ${exam.status} to ${newStatus}. Allowed: ${(allowed || []).join(", ") || "none"}`
        );
    }

    // Require at least one schedule item before publishing
    if (newStatus === "PUBLISHED" && (!exam.schedule || exam.schedule.length === 0)) {
        throw new BadRequestError("Cannot publish an exam without at least one schedule entry");
    }

    exam.status = newStatus;
    await exam.save();

    if (newStatus === "PUBLISHED") {
        await createExamCalendarEvents(exam, schoolId);
    }
    if (newStatus === "COMPLETED") {
        await deleteExamCalendarEvents(exam);
    }

    logger.info(`Exam status changed: ${examId} → ${newStatus}`);
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

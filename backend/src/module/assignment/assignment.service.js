import mongoose from "mongoose";
import { Assignment } from "./Assignment.model.js";
import { Submission } from "./Submission.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import User from "../user/model/User.model.js";
import { Timetable, TimetableEntry } from "../timetable/Timetable.model.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";
import {
    assertClassSectionExists,
    buildClassSectionKey,
    getConfiguredClassSections,
    normalizeClassSection,
} from "../../utils/classSection.util.js";
import { createAuditLog } from "../audit/audit.service.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";

const isAdminRole = (role) => [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role);

const normalizeFileType = (file = {}) => {
    const originalName = file.originalname || file.name || "";
    const extension = originalName.includes(".")
        ? originalName.split(".").pop().toLowerCase()
        : "";

    if (file.mimetype === "application/pdf" || extension === "pdf") return "pdf";
    if (["image/jpeg", "image/jpg"].includes(file.mimetype) || ["jpeg", "jpg"].includes(extension)) return "jpg";
    if (file.mimetype === "image/png" || extension === "png") return "png";
    if (file.mimetype === "application/msword" || extension === "doc") return "doc";
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === "docx") return "docx";

    return extension || (file.mimetype ? file.mimetype.split("/").pop() : null);
};

const mapFiles = (files = []) =>
    files.map((file) => {
        const originalName = file.originalname || file.name || "file";

        return {
            url: file.path || file.secure_url,
            publicId: file.filename || file.public_id,
            name: originalName,
            originalName,
            fileType: normalizeFileType(file),
        };
    });

const formatFile = (file = {}) => {
    const originalName = file.originalName || file.name || "file";

    return {
        ...file,
        name: originalName,
        originalName,
        fileType: file.fileType || null,
    };
};

const formatSubmission = (submission) => {
    if (!submission) return null;

    return {
        ...submission,
        files: (submission.files || []).map(formatFile),
    };
};

const formatAssignment = (assignment, extras = {}) => {
    const attachments = (assignment.attachments || []).map(formatFile);
    const requiresSubmission = assignment?.requiresSubmission !== false;

    return {
        ...assignment,
        attachments,
        attachmentsCount: attachments.length,
        requiresSubmission,
        ...(extras.hasSubmitted !== undefined && {
            hasSubmitted: extras.hasSubmitted,
            submitted: extras.hasSubmitted,
        }),
        ...(extras.submissionCount !== undefined && { submissionCount: extras.submissionCount }),
    };
};

const normalizeDueDate = (value) => {
    if (!value) return null;

    const trimmed = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parsedDate = new Date(`${trimmed}T23:59:59.999Z`);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    const parsedDate = new Date(trimmed);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const assertFutureDueDate = (value) => {
    const dueDate = normalizeDueDate(value);

    if (!dueDate) {
        throw new BadRequestError("Due date must be a valid date");
    }

    if (dueDate <= new Date()) {
        throw new BadRequestError("Due date must be in the future");
    }

    return dueDate;
};

const normalizeSectionValues = (body = {}) => {
    const rawSections = Array.isArray(body.sections)
        ? body.sections
        : body.section
            ? [body.section]
            : [];

    return Array.from(
        new Set(
            rawSections
                .map((value) => String(value || "").trim().toUpperCase())
                .filter(Boolean)
        )
    );
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sortAlphaNumeric = (items = []) =>
    [...items].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));

const getConfiguredClassSectionContext = async (schoolId) => {
    const { classSections, keySet } = await getConfiguredClassSections(schoolId);
    return { classSections, keySet };
};

const assertClassSectionConfigured = async (schoolId, standard, section) => {
    return assertClassSectionExists(schoolId, standard, section, {
        message: "Selected class-section is not configured in Settings",
    });
};

const assertCanManageAssignment = (role) => {
    if (![USER_ROLES.TEACHER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role)) {
        throw new ForbiddenError("You do not have permission to manage assignments");
    }
};

const getActiveTeacherIds = async (schoolId) => {
    const teachers = await User.find({
        schoolId,
        role: USER_ROLES.TEACHER,
        isActive: true,
        isArchived: false,
    })
        .select("_id")
        .lean();

    return teachers.map((teacher) => teacher._id);
};

const normalizeTeacherScopeEntry = (entry = {}) => {
    const normalized = normalizeClassSection(entry);
    if (!normalized.standard || !normalized.section) {
        return null;
    }

    return normalized;
};

const buildTeacherAssignmentScope = async (schoolId, teacherId, options = {}) => {
    const { keySet = null } = options;
    const [teacherProfile, timetableEntries] = await Promise.all([
        TeacherProfile.findOne({
            schoolId,
            userId: teacherId,
        })
            .select("assignedClasses")
            .lean(),
        TimetableEntry.find({
            schoolId,
            teacherId,
        })
            .select("teacherId timetableId subject")
            .populate({
                path: "timetableId",
                select: "standard section",
            })
            .lean(),
    ]);

    const classKeys = new Set();
    const subjectMap = new Map();

    const register = ({ standard, section, subjects = [] }) => {
        const normalized = normalizeTeacherScopeEntry({ standard, section });
        if (!normalized) return;

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (keySet && !keySet.has(key)) return;

        classKeys.add(key);

        if (!subjectMap.has(key)) {
            subjectMap.set(key, new Set());
        }

        subjects.forEach((subject) => {
            const trimmed = String(subject || "").trim();
            if (trimmed) {
                subjectMap.get(key).add(trimmed);
            }
        });
    };

    (teacherProfile?.assignedClasses || []).forEach((assignedClass) => {
        register({
            standard: assignedClass.standard,
            section: assignedClass.section,
            subjects: assignedClass.subjects || [],
        });
    });

    timetableEntries.forEach((entry) => {
        register({
            standard: entry.timetableId?.standard,
            section: entry.timetableId?.section,
            subjects: entry.subject ? [entry.subject] : [],
        });
    });

    return { classKeys, subjectMap };
};

const findMatchingTeacherIdsForAssignment = async (schoolId, standard, section, subject) => {
    const activeTeacherIds = await getActiveTeacherIds(schoolId);
    if (!activeTeacherIds.length) {
        return [];
    }

    const [profiles, timetableEntries] = await Promise.all([
        TeacherProfile.find({
            schoolId,
            userId: { $in: activeTeacherIds },
            assignedClasses: {
                $elemMatch: {
                    standard,
                    section,
                    subjects: subject,
                },
            },
        })
            .select("userId")
            .lean(),
        TimetableEntry.find({
            schoolId,
            teacherId: { $in: activeTeacherIds },
            subject,
        })
            .select("teacherId timetableId subject")
            .populate({
                path: "timetableId",
                select: "standard section",
            })
            .lean(),
    ]);

    const matchingTeacherIds = new Set(
        profiles.map((profile) => String(profile.userId))
    );

    timetableEntries.forEach((entry) => {
        const normalized = normalizeTeacherScopeEntry(entry.timetableId || {});
        if (!normalized) return;

        if (
            normalized.standard === String(standard || "").trim() &&
            normalized.section === String(section || "").trim().toUpperCase()
        ) {
            matchingTeacherIds.add(String(entry.teacherId));
        }
    });

    return [...matchingTeacherIds];
};

const resolveAssignedTeacherForAssignment = async ({
    schoolId,
    standard,
    section,
    subject,
    requestedTeacherId,
    requestingUser,
}) => {
    const teacherIds = await findMatchingTeacherIdsForAssignment(schoolId, standard, section, subject);

    if (requestedTeacherId) {
        if (!teacherIds.includes(String(requestedTeacherId))) {
            throw new BadRequestError(
                `Selected assigned teacher is not mapped to Class ${standard}-${section} for ${subject}`
            );
        }

        return requestedTeacherId;
    }

    if (
        requestingUser?.role === USER_ROLES.TEACHER &&
        teacherIds.includes(String(requestingUser._id))
    ) {
        return String(requestingUser._id);
    }

    if (teacherIds.length === 1) {
        return teacherIds[0];
    }

    if (teacherIds.length === 0) {
        throw new BadRequestError(
            `No responsible teacher is mapped to Class ${standard}-${section} for ${subject}. Please assign the subject teacher first.`
        );
    }

    throw new BadRequestError(
        `Multiple teachers are mapped to Class ${standard}-${section} for ${subject}. Please choose the responsible teacher explicitly.`
    );
};

const deleteStoredFileIfUnused = async (schoolId, file = {}) => {
    if (!file?.publicId || !file?.url) {
        return;
    }

    const [assignmentRefCount, submissionRefCount] = await Promise.all([
        Assignment.countDocuments({ schoolId, "attachments.publicId": file.publicId }),
        Submission.countDocuments({ schoolId, "files.publicId": file.publicId }),
    ]);

    if (assignmentRefCount > 0 || submissionRefCount > 0) {
        return;
    }

    await deleteFromCloudinary(file.url);
};

const isPastDue = (dueDate, referenceDate = new Date()) => {
    const parsedDate = new Date(dueDate);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() < referenceDate.getTime();
};

const closeExpiredAssignments = async (schoolId) => {
    await Assignment.updateMany(
        {
            schoolId,
            status: "active",
            dueDate: { $lt: new Date() },
        },
        {
            $set: { status: "closed" },
        }
    );
};

const closeExpiredAssignmentById = async (schoolId, assignmentId) => {
    await Assignment.updateOne(
        {
            _id: assignmentId,
            schoolId,
            status: "active",
            dueDate: { $lt: new Date() },
        },
        {
            $set: { status: "closed" },
        }
    );
};

const applyResolvedStatus = (assignment, requestedStatus) => {
    if (isPastDue(assignment.dueDate)) {
        assignment.status = "closed";
        return;
    }

    if (requestedStatus !== undefined) {
        assignment.status = requestedStatus;
    }
};

const assertCanViewAssignment = async (assignment, schoolId, userId, role) => {
    if (isAdminRole(role) || role === USER_ROLES.TEACHER) {
        return;
    }

    const profile = await StudentProfile.findOne({ schoolId, userId }).lean();
    if (!profile) {
        throw new NotFoundError("Student profile not found");
    }

    if (profile.standard !== assignment.standard || profile.section !== assignment.section) {
        throw new ForbiddenError("You do not have access to this assignment");
    }
};

const buildAssignmentSummaryMap = async (assignmentIds = []) => {
    if (!assignmentIds.length) {
        return new Map();
    }

    const submissionCounts = await Submission.aggregate([
        { $match: { assignmentId: { $in: assignmentIds } } },
        { $group: { _id: "$assignmentId", count: { $sum: 1 } } },
    ]);

    return new Map(submissionCounts.map((entry) => [entry._id.toString(), entry.count]));
};

export const createAssignment = async (schoolId, user, body, files, metadata) => {
    const userId = user._id;
    const subject = String(body.subject || "").trim();
    const dueDate = assertFutureDueDate(body.dueDate);
    const requestedSections = normalizeSectionValues(body);
    const attachmentRefs = mapFiles(files);

    if (!subject) {
        throw new BadRequestError("Subject is required");
    }

    if (!body.standard || requestedSections.length === 0) {
        throw new BadRequestError("Standard and at least one section are required");
    }

    const assignmentPayloads = [];

    for (const section of requestedSections) {
        const normalizedClassSection = await assertClassSectionConfigured(schoolId, body.standard, section);
        const assignedTeacher = await resolveAssignedTeacherForAssignment({
            schoolId,
            standard: normalizedClassSection.standard,
            section: normalizedClassSection.section,
            subject,
            requestedTeacherId: body.assignedTeacher,
            requestingUser: user,
        });

        assignmentPayloads.push({
            schoolId,
            createdBy: userId,
            title: body.title,
            description: body.description || "",
            subject,
            standard: normalizedClassSection.standard,
            section: normalizedClassSection.section,
            dueDate,
            attachments: attachmentRefs,
            requiresSubmission: true,
            assignedTeacher,
        });
    }

    const createdAssignments = await Assignment.insertMany(assignmentPayloads);

    createdAssignments.forEach((assignment) => {
        logger.info(`Assignment created: ${assignment._id}`);
        
        createAuditLog({
            schoolId,
            actorId: user._id,
            actorRole: user.role,
            action: AUDIT_ACTIONS.ASSIGNMENT.CREATED,
            targetModel: "Assignment",
            targetId: assignment._id,
            description: `Created assignment: ${assignment.title} for Class ${assignment.standard}-${assignment.section}`,
            metadata: {
                title: assignment.title,
                subject: assignment.subject,
                standard: assignment.standard,
                section: assignment.section
            },
            ip: metadata?.ip,
            userAgentString: metadata?.userAgent
        }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));
    });

    return {
        createdCount: createdAssignments.length,
        assignments: createdAssignments.map((assignment) => formatAssignment(assignment.toObject())),
    };
};

export const listAssignments = async (schoolId, userId, role, query = {}) => {
    const filter = { schoolId };

    if (role === USER_ROLES.TEACHER || isAdminRole(role)) {
        if (query.standard && query.standard !== "all") filter.standard = query.standard;
        if (query.section && query.section !== "all") filter.section = query.section;
        if (query.teacherId && mongoose.Types.ObjectId.isValid(query.teacherId)) {
            filter.assignedTeacher = query.teacherId;
        }
    } else if (role === USER_ROLES.STUDENT) {
        const profile = await StudentProfile.findOne({ schoolId, userId }).lean();
        if (!profile) throw new NotFoundError("Student profile not found");

        filter.standard = profile.standard;
        filter.section = profile.section;
        filter.status = "active";
    } else {
        if (query.standard && query.standard !== "all") filter.standard = query.standard;
        if (query.section && query.section !== "all") filter.section = query.section;
        if (query.teacherId && mongoose.Types.ObjectId.isValid(query.teacherId)) {
            filter.assignedTeacher = query.teacherId;
        }
    }

    if (role !== USER_ROLES.STUDENT && query.status && query.status !== "all") {
        filter.status = query.status;
    }

    if (query.subject && query.subject !== "all") {
        filter.subject = query.subject;
    }

    if (query.search?.trim()) {
        filter.$text = { $search: query.search.trim() };
    }

    const page = parseInt(query.page, 10) || 0;
    const pageSize = parseInt(query.pageSize, 10) || 25;
    const skip = page * pageSize;

    const [total, assignments] = await Promise.all([
        Assignment.countDocuments(filter),
        Assignment.find(filter)
            .populate("createdBy", "name email")
            .populate("assignedTeacher", "name email avatarUrl")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean(),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const submissionCountMap = await buildAssignmentSummaryMap(assignmentIds);

    let submittedSet = new Set();
    if (role === USER_ROLES.STUDENT && assignmentIds.length) {
        const submissions = await Submission.find({
            assignmentId: { $in: assignmentIds },
            studentId: userId,
        })
            .select("assignmentId")
            .lean();

        submittedSet = new Set(submissions.map((entry) => entry.assignmentId.toString()));
    }

    return {
        assignments: assignments.map((assignment) =>
            formatAssignment(assignment, {
                hasSubmitted: role === USER_ROLES.STUDENT
                    ? submittedSet.has(assignment._id.toString())
                    : undefined,
                submissionCount: submissionCountMap.get(assignment._id.toString()) || 0,
            })
        ),
        pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

export const listSubmittedAssignments = async (schoolId, userId, role, query = {}) => {
    if (![USER_ROLES.TEACHER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(role)) {
        throw new ForbiddenError("You are not allowed to view submitted assignments");
    }

    const assignmentFilter = { schoolId };

    if (query.standard && query.standard !== "all") {
        assignmentFilter.standard = query.standard;
    }

    if (query.section && query.section !== "all") {
        assignmentFilter.section = query.section;
    }

    if (query.subject && query.subject !== "all") {
        assignmentFilter.subject = query.subject;
    }

    const baseAssignments = await Assignment.find(assignmentFilter)
        .select("_id")
        .lean();

    if (!baseAssignments.length) {
        return {
            submissions: [],
            pagination: {
                total: 0,
                page: parseInt(query.page, 10) || 0,
                pageSize: parseInt(query.pageSize, 10) || 25,
                totalPages: 0,
            },
        };
    }

    const allowedAssignmentIds = baseAssignments.map((assignment) => assignment._id);
    const submissionFilter = {
        schoolId,
        assignmentId: { $in: allowedAssignmentIds },
    };

    if (query.search?.trim()) {
        const searchRegex = new RegExp(escapeRegExp(query.search.trim()), "i");
        const User = mongoose.model("User");

        const [matchingAssignments, matchingUsers, matchingProfiles] = await Promise.all([
            Assignment.find({
                ...assignmentFilter,
                $text: { $search: query.search.trim() },
            })
                .select("_id")
                .lean(),
            User.find({
                isArchived: false,
                $or: [
                    { name: searchRegex },
                    { email: searchRegex },
                ],
            })
                .select("_id")
                .lean(),
            StudentProfile.find({
                schoolId,
                rollNumber: searchRegex,
            })
                .select("userId")
                .lean(),
        ]);

        const matchedAssignmentIds = matchingAssignments.map((assignment) => assignment._id);
        const matchedStudentIds = [
            ...matchingUsers.map((user) => user._id.toString()),
            ...matchingProfiles.map((profile) => profile.userId.toString()),
        ];

        const studentIdSet = [...new Set(matchedStudentIds)]
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        const searchClauses = [];
        if (matchedAssignmentIds.length) {
            searchClauses.push({ assignmentId: { $in: matchedAssignmentIds } });
        }
        if (studentIdSet.length) {
            searchClauses.push({ studentId: { $in: studentIdSet } });
        }

        if (!searchClauses.length) {
            return {
                submissions: [],
                pagination: {
                    total: 0,
                    page: parseInt(query.page, 10) || 0,
                    pageSize: parseInt(query.pageSize, 10) || 25,
                    totalPages: 0,
                },
            };
        }

        submissionFilter.$and = [
            ...(submissionFilter.$and || []),
            { $or: searchClauses },
        ];
    }

    const page = parseInt(query.page, 10) || 0;
    const pageSize = parseInt(query.pageSize, 10) || 25;
    const skip = page * pageSize;

    const [total, submissions] = await Promise.all([
        Submission.countDocuments(submissionFilter),
        Submission.find(submissionFilter)
            .populate({
                path: "assignmentId",
                select: "title subject standard section dueDate status createdBy assignedTeacher requiresSubmission attachments",
                populate: [
                    {
                        path: "createdBy",
                        select: "name email",
                    },
                    {
                        path: "assignedTeacher",
                        select: "name email avatarUrl",
                    },
                ],
            })
            .populate({
                path: "studentId",
                select: "name email",
            })
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean(),
    ]);

    const validSubmissions = submissions.filter((submission) => submission.assignmentId && submission.studentId);
    const studentIds = validSubmissions.map((submission) => submission.studentId._id);
    const studentProfiles = await StudentProfile.find({
        schoolId,
        userId: { $in: studentIds },
    })
        .select("userId rollNumber standard section")
        .lean();

    const profileMap = new Map(
        studentProfiles.map((profile) => [profile.userId.toString(), profile])
    );

    return {
        submissions: validSubmissions.map((submission) => {
            const profile = profileMap.get(submission.studentId._id.toString());

            return {
                ...formatSubmission(submission),
                assignment: formatAssignment(submission.assignmentId),
                student: {
                    _id: submission.studentId._id,
                    name: submission.studentId.name,
                    email: submission.studentId.email,
                    rollNumber: profile?.rollNumber || null,
                    standard: profile?.standard || null,
                    section: profile?.section || null,
                },
            };
        }),
        pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    };
};

export const getAssignment = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    await closeExpiredAssignmentById(schoolId, assignmentId);

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .populate("createdBy", "name email")
        .populate("assignedTeacher", "name email avatarUrl")
        .lean();

    if (!assignment) throw new NotFoundError("Assignment not found");

    await assertCanViewAssignment(assignment, schoolId, userId, role);

    const response = formatAssignment(assignment);

    if (isAdminRole(role) || role === USER_ROLES.TEACHER) {
        const submissions = await Submission.find({ assignmentId }).lean();
        const studentIds = submissions.map((entry) => entry.studentId);
        const User = mongoose.model("User");
        const students = await User.find({ _id: { $in: studentIds } })
            .select("name email")
            .lean();
        const studentMap = new Map(students.map((student) => [student._id.toString(), student]));

        response.submissions = submissions.map((submission) => ({
            ...formatSubmission(submission),
            student: studentMap.get(submission.studentId.toString()) || null,
        }));
    }

    if (role === USER_ROLES.STUDENT) {
        const mySubmission = await Submission.findOne({ assignmentId, studentId: userId, schoolId }).lean();
        response.hasSubmitted = Boolean(mySubmission);
        response.submitted = Boolean(mySubmission);
    }

    return response;
};

export const updateAssignment = async (schoolId, assignmentId, user, role, body, files, metadata) => {
    const userId = user._id;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    assertCanManageAssignment(role);

    // Capture state BEFORE update for diff
    const before = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!before) throw new NotFoundError("Assignment not found");

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (body.dueDate !== undefined) {
        assignment.dueDate = assertFutureDueDate(body.dueDate);
    }

    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.assignedTeacher !== undefined) {
        assignment.assignedTeacher = await resolveAssignedTeacherForAssignment({
            schoolId,
            standard: assignment.standard,
            section: assignment.section,
            subject: assignment.subject,
            requestedTeacherId: body.assignedTeacher,
            requestingUser: user,
        });
    }
    assignment.requiresSubmission = true;
    applyResolvedStatus(assignment, body.status);

    if (files?.length) {
        assignment.attachments.push(...mapFiles(files));
    }

    await assignment.save();
    logger.info(`Assignment updated: ${assignmentId}`);

    // Capture state AFTER update for diff
    const after = await Assignment.findById(assignmentId).lean();

    // Build field-level changes diff
    const IGNORED_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'schoolId'];
    const changes = [];
    if (before && after) {
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
            if (IGNORED_FIELDS.includes(key)) continue;
            const prev = JSON.stringify(before[key]);
            const next = JSON.stringify(after[key]);
            if (prev !== next) {
                changes.push({ field: key, before: before[key], after: after[key] });
            }
        }
    }

    createAuditLog({
        schoolId,
        actorId: user._id,
        actorRole: user.role,
        action: AUDIT_ACTIONS.ASSIGNMENT.UPDATED,
        targetModel: "Assignment",
        targetId: assignment._id,
        description: `Updated assignment: ${assignment.title}`,
        metadata: { changes },
        ip: metadata?.ip,
        userAgentString: metadata?.userAgent
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return formatAssignment(assignment.toObject());
};

export const deleteAssignment = async (schoolId, assignmentId, user, metadata) => {
    const role = user.role;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!isAdminRole(role)) {
        throw new ForbiddenError("Only admins can delete assignments");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    const attachmentsToClean = [...assignment.attachments];
    const submissions = await Submission.find({ assignmentId }).lean();
    const submissionFilesToClean = submissions.flatMap((submission) => submission.files || []);
    await Submission.deleteMany({ assignmentId });
    await Assignment.deleteOne({ _id: assignmentId });

    for (const attachment of attachmentsToClean) {
        await deleteStoredFileIfUnused(schoolId, attachment);
    }

    for (const file of submissionFilesToClean) {
        await deleteStoredFileIfUnused(schoolId, file);
    }

    logger.info(`Assignment deleted with cascade: ${assignmentId}`);

    createAuditLog({
        schoolId,
        actorId: user._id,
        actorRole: user.role,
        action: AUDIT_ACTIONS.ASSIGNMENT.DELETED,
        targetModel: "Assignment",
        targetId: assignmentId,
        description: `Deleted assignment: ${assignment.title} along with ${submissions.length} submissions`,
        metadata: {
            title: assignment.title,
            submissionsCleaned: submissions.length
        },
        ip: metadata?.ip,
        userAgentString: metadata?.userAgent
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));
};

export const removeAttachment = async (schoolId, assignmentId, user, publicId, metadata) => {
    const role = user.role;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!publicId || typeof publicId !== "string") {
        throw new BadRequestError("Invalid attachment public ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    assertCanManageAssignment(role);

    const attachmentIndex = assignment.attachments.findIndex((entry) => entry.publicId === publicId);
    if (attachmentIndex === -1) throw new NotFoundError("Attachment not found");

    const [attachment] = assignment.attachments.splice(attachmentIndex, 1);
    applyResolvedStatus(assignment);
    await assignment.save();
    await deleteStoredFileIfUnused(schoolId, attachment);

    logger.info(`Attachment removed from assignment ${assignmentId}: ${publicId}`);

    createAuditLog({
        schoolId,
        actorId: user._id,
        actorRole: user.role,
        action: AUDIT_ACTIONS.ASSIGNMENT.UPDATED,
        targetModel: "Assignment",
        targetId: assignment._id,
        description: `Removed attachment from assignment: ${assignment.title}`,
        metadata: { removedAttachment: publicId },
        ip: metadata?.ip,
        userAgentString: metadata?.userAgent
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return formatAssignment(assignment.toObject());
};

export const submitAssignment = async (schoolId, assignmentId, user, files, metadata) => {
    const studentId = user._id;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!files?.length) {
        throw new BadRequestError("At least one submission file is required");
    }

    if (files.length > 5) {
        throw new BadRequestError("A maximum of 5 submission files are allowed");
    }

    await closeExpiredAssignmentById(schoolId, assignmentId);

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (assignment.requiresSubmission === false) {
        throw new BadRequestError("This assignment does not require a submission");
    }

    if (assignment.status === "closed") {
        throw new BadRequestError("Assignment is closed for submissions");
    }

    const profile = await StudentProfile.findOne({ schoolId, userId: studentId }).lean();
    if (!profile) throw new NotFoundError("Student profile not found");

    if (profile.standard !== assignment.standard || profile.section !== assignment.section) {
        throw new ForbiddenError("You are not in the class this assignment belongs to");
    }

    const isLate = new Date() > new Date(assignment.dueDate);
    const mappedFiles = mapFiles(files);

    const existing = await Submission.findOne({ assignmentId, studentId });

    if (existing) {
        const previousFiles = [...(existing.files || [])];
        existing.files = mappedFiles;
        existing.isLate = isLate;
        existing.submittedAt = new Date();
        await existing.save();

        for (const file of previousFiles) {
            await deleteStoredFileIfUnused(schoolId, file);
        }

        logger.info(`Re-submission for assignment ${assignmentId} by student ${studentId}`);
        
        createAuditLog({
            schoolId,
            actorId: user._id,
            actorRole: user.role,
            action: AUDIT_ACTIONS.ASSIGNMENT.SUBMITTED,
            targetModel: "Assignment",
            targetId: assignment._id,
            description: `Re-submitted assignment: ${assignment.title}`,
            metadata: { isLate, reSubmission: true },
            ip: metadata?.ip,
            userAgentString: metadata?.userAgent
        }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

        return formatSubmission(existing.toObject());
    }

    const submission = await Submission.create({
        assignmentId,
        studentId,
        schoolId,
        files: mappedFiles,
        isLate,
    });

    logger.info(`Submission created for assignment ${assignmentId} by student ${studentId}`);
    
    createAuditLog({
        schoolId,
        actorId: user._id,
        actorRole: user.role,
        action: AUDIT_ACTIONS.ASSIGNMENT.SUBMITTED,
        targetModel: "Assignment",
        targetId: assignment._id,
        description: `Submitted assignment: ${assignment.title}`,
        metadata: { isLate, reSubmission: false },
        ip: metadata?.ip,
        userAgentString: metadata?.userAgent
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return formatSubmission(submission.toObject());
};

export const getMySubmission = async (schoolId, assignmentId, studentId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    await closeExpiredAssignmentById(schoolId, assignmentId);

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!assignment) {
        throw new NotFoundError("Assignment not found");
    }

    await assertCanViewAssignment(assignment, schoolId, studentId, USER_ROLES.STUDENT);

    const submission = await Submission.findOne({ assignmentId, studentId, schoolId }).lean();
    return formatSubmission(submission);
};

export const listSubmissions = async (schoolId, assignmentId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    await closeExpiredAssignmentById(schoolId, assignmentId);

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .select("title subject standard section dueDate status createdBy assignedTeacher requiresSubmission attachments")
        .populate("assignedTeacher", "name email avatarUrl")
        .lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    const studentProfiles = await StudentProfile.find({
        schoolId,
        standard: assignment.standard,
        section: assignment.section,
    })
        .select("userId rollNumber")
        .lean();

    const studentUserIds = studentProfiles.map((profile) => profile.userId);
    const User = mongoose.model("User");
    const students = await User.find({
        _id: { $in: studentUserIds },
        isArchived: false,
    })
        .select("name email")
        .lean();

    const rollMap = new Map(studentProfiles.map((profile) => [profile.userId.toString(), profile.rollNumber]));
    const submissions = await Submission.find({ assignmentId }).lean();
    const submissionMap = new Map(submissions.map((submission) => [submission.studentId.toString(), submission]));

    const mergedStudents = students.map((student) => {
        const submission = submissionMap.get(student._id.toString());

        return {
            studentId: student._id,
            name: student.name,
            email: student.email,
            rollNumber: rollMap.get(student._id.toString()) || null,
            submitted: Boolean(submission),
            ...(submission && {
                submittedAt: submission.submittedAt,
                isLate: submission.isLate,
                files: (submission.files || []).map(formatFile),
            }),
        };
    });

    const submittedCount = mergedStudents.filter((entry) => entry.submitted).length;

    return {
        assignment: formatAssignment(assignment, { submissionCount: submittedCount }),
        counts: {
            totalStudents: mergedStudents.length,
            submitted: submittedCount,
            pending: mergedStudents.length - submittedCount,
        },
        students: mergedStudents,
    };
};

export const getAssignmentMetadata = async (schoolId, user) => {
    const { classSections, keySet } = await getConfiguredClassSectionContext(schoolId);

    const standards = new Set();
    const sections = new Set();
    const subjects = new Set();
    const mappings = {
        classSections: {},
        sectionSubjects: {},
    };

    // ── Teacher-scoped filtering ─────────────────────────────────
    // When the caller is a teacher, restrict the dropdown options to
    // only the classes and subjects they are assigned to teach.
    let teacherClassKeys = null; // null = no restriction (admin)
    let teacherSubjectMap = null; // Map<"standard-section", Set<subject>>

    if (user?.role === USER_ROLES.TEACHER) {
        const teacherScope = await buildTeacherAssignmentScope(schoolId, user._id, { keySet });

        if (teacherScope.classKeys.size > 0) {
            teacherClassKeys = new Set();
            teacherSubjectMap = new Map();

            teacherScope.classKeys.forEach((key) => {
                teacherClassKeys.add(key);
            });

            teacherScope.subjectMap.forEach((subjectSet, key) => {
                const [standard, section] = key.split("::");
                teacherSubjectMap.set(`${standard}-${section}`, new Set(subjectSet));
            });
        } else {
            // Teacher has no assigned classes → return empty metadata
            return {
                standards: [],
                sections: [],
                subjects: [],
                mappings: { classSections: {}, sectionSubjects: {} },
            };
        }
    }

    // ── Build class-sections and seed subjects from school config ──
    // classSections from getConfiguredClassSections include { standard, section, subjects }
    classSections.forEach(({ standard, section, subjects: configSubjects }) => {
        const key = buildClassSectionKey(standard, section);

        // Skip class-sections that this teacher is not assigned to
        if (teacherClassKeys && !teacherClassKeys.has(key)) return;

        standards.add(standard);
        sections.add(section);

        if (!mappings.classSections[standard]) {
            mappings.classSections[standard] = new Set();
        }
        mappings.classSections[standard].add(section);

        const mapKey = `${standard}-${section}`;
        if (!mappings.sectionSubjects[mapKey]) {
            mappings.sectionSubjects[mapKey] = new Set();
        }

        // Add subjects from school config (the primary subject source!)
        if (Array.isArray(configSubjects)) {
            for (const subj of configSubjects) {
                const trimmed = String(subj || "").trim();
                if (!trimmed) continue;

                // For teachers, only include subjects they actually teach
                if (teacherSubjectMap) {
                    const allowed = teacherSubjectMap.get(mapKey);
                    if (!allowed || !allowed.has(trimmed)) continue;
                }

                subjects.add(trimmed);
                mappings.sectionSubjects[mapKey].add(trimmed);
            }
        }
    });

    // ── For teachers, also populate subjects directly from their profile ──
    // (catches subjects that exist in teacher's assignment but may be missing from school config)
    if (teacherSubjectMap) {
        for (const [mapKey, subjectSet] of teacherSubjectMap) {
            if (!mappings.sectionSubjects[mapKey]) continue;

            for (const subject of subjectSet) {
                subjects.add(subject);
                mappings.sectionSubjects[mapKey].add(subject);
            }
        }
    }

    // ── For admins, also pull subjects from all teacher profiles ──
    if (!teacherSubjectMap) {
        const allTeacherProfiles = await TeacherProfile.find({ schoolId })
            .select("assignedClasses")
            .lean();

        for (const profile of allTeacherProfiles) {
            for (const ac of profile.assignedClasses || []) {
                const normalized = normalizeClassSection(ac);
                const key = buildClassSectionKey(normalized.standard, normalized.section);
                if (!keySet.has(key)) continue;

                const mapKey = `${normalized.standard}-${normalized.section}`;
                if (!mappings.sectionSubjects[mapKey]) continue;

                for (const subj of ac.subjects || []) {
                    const trimmed = String(subj || "").trim();
                    if (!trimmed) continue;
                    subjects.add(trimmed);
                    mappings.sectionSubjects[mapKey].add(trimmed);
                }
            }
        }
    }

    // ── Enrich from timetable entries and existing assignments ──
    const timetables = await Timetable.find({ schoolId })
        .select("_id standard section")
        .lean();

    const timetableClassMap = new Map();
    for (const timetable of timetables) {
        const normalized = normalizeClassSection(timetable);
        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!keySet.has(key)) continue;
        if (teacherClassKeys && !teacherClassKeys.has(key)) continue;
        timetableClassMap.set(String(timetable._id), normalized);
    }

    const allowedTimetableIds = [...timetableClassMap.keys()]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const [entries, assignments] = await Promise.all([
        allowedTimetableIds.length
            ? TimetableEntry.find({ schoolId, timetableId: { $in: allowedTimetableIds } })
                .select("timetableId subject")
                .lean()
            : [],
        Assignment.find({ schoolId })
            .select("standard section subject")
            .lean(),
    ]);

    entries.forEach((entry) => {
        const timetableClass = timetableClassMap.get(String(entry.timetableId));
        if (!timetableClass || !entry.subject) return;

        const mapKey = `${timetableClass.standard}-${timetableClass.section}`;

        // For teachers, only include subjects they actually teach for that class
        if (teacherSubjectMap) {
            const allowed = teacherSubjectMap.get(mapKey);
            if (!allowed || !allowed.has(entry.subject)) return;
        }

        subjects.add(entry.subject);
        mappings.sectionSubjects[mapKey]?.add(entry.subject);
    });

    assignments.forEach((assignment) => {
        const normalized = normalizeClassSection(assignment);
        if (!normalized.standard || !normalized.section || !assignment.subject) return;

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!keySet.has(key)) return;
        if (teacherClassKeys && !teacherClassKeys.has(key)) return;

        const mapKey = `${normalized.standard}-${normalized.section}`;

        // For teachers, only include subjects they actually teach for that class
        if (teacherSubjectMap) {
            const allowed = teacherSubjectMap.get(mapKey);
            if (!allowed || !allowed.has(assignment.subject)) return;
        }

        subjects.add(assignment.subject);
        mappings.sectionSubjects[mapKey]?.add(assignment.subject);
    });

    const result = {
        standards: sortAlphaNumeric(Array.from(standards)),
        sections: sortAlphaNumeric(Array.from(sections)),
        subjects: sortAlphaNumeric(Array.from(subjects)),
        mappings: {
            classSections: {},
            sectionSubjects: {},
        },
    };

    Object.keys(mappings.classSections).forEach((standard) => {
        result.mappings.classSections[standard] = sortAlphaNumeric(Array.from(mappings.classSections[standard]));
    });

    Object.keys(mappings.sectionSubjects).forEach((key) => {
        result.mappings.sectionSubjects[key] = sortAlphaNumeric(Array.from(mappings.sectionSubjects[key]));
    });

    return result;
};

export const startAssignmentExpiryJob = () => {
    const runJob = () => {
        Assignment.updateMany(
            { status: "active", dueDate: { $lt: new Date() } },
            { $set: { status: "closed" } }
        ).catch((err) => logger.error(err, "Failed to close expired assignments"));
    };

    runJob(); // Run immediately on startup
    setInterval(runJob, 15 * 60 * 1000); // Every 15 minutes
};

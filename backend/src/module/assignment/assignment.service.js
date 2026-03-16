import mongoose from "mongoose";
import { Assignment } from "./Assignment.model.js";
import { Submission } from "./Submission.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";

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

    return {
        ...assignment,
        attachments,
        attachmentsCount: attachments.length,
        requiresSubmission: Boolean(assignment.requiresSubmission),
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

const normalizeBoolean = (value, defaultValue = false) => {
    if (value === undefined) return defaultValue;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return Boolean(value);
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTeacherAssignmentScope = async (schoolId, userId) => {
    const profile = await TeacherProfile.findOne({ schoolId, userId })
        .select("assignedClasses")
        .lean();

    const profileClasses = profile?.assignedClasses || [];

    const { TimetableEntry } = await import("../timetable/Timetable.model.js");
    const entries = await TimetableEntry.find({ schoolId, teacherId: userId })
        .populate({ path: "timetableId", select: "standard section" })
        .lean();

    const classes = [];
    const subjectMap = new Map();
    const seen = new Set();

    const registerClass = (standard, section) => {
        if (!standard || !section) return;

        const key = `${standard}-${section}`;
        if (!seen.has(key)) {
            seen.add(key);
            classes.push({ standard, section });
        }

        if (!subjectMap.has(key)) {
            subjectMap.set(key, new Set());
        }
    };

    profileClasses.forEach(({ standard, section, subjects = [] }) => {
        registerClass(standard, section);
        const key = `${standard}-${section}`;

        subjects.forEach((subject) => {
            if (!subject) return;
            subjectMap.get(key)?.add(subject);
        });
    });

    entries.forEach((entry) => {
        const standard = entry.timetableId?.standard;
        const section = entry.timetableId?.section;
        const subject = entry.subject;

        registerClass(standard, section);

        if (subject) {
            subjectMap.get(`${standard}-${section}`)?.add(subject);
        }
    });

    if (classes.length === 0) {
        throw new BadRequestError("No classes assigned to this teacher");
    }

    return {
        classes,
        subjectMap,
        profileClasses,
        entries,
    };
};

const getTeacherClasses = async (schoolId, userId) => {
    const scope = await getTeacherAssignmentScope(schoolId, userId);
    return scope.classes;
};

const assertTeacherAssignmentAccess = (scope, standard, section, subject) => {
    const classKey = `${standard}-${section}`;
    const hasClassAccess = scope.classes.some(
        (entry) => entry.standard === standard && entry.section === section
    );

    if (!hasClassAccess) {
        throw new ForbiddenError(`You do not have permission to access Class ${standard}-${section}`);
    }

    if (!subject) return;

    const allowedSubjects = scope.subjectMap.get(classKey);
    if (allowedSubjects?.size && !allowedSubjects.has(subject)) {
        throw new ForbiddenError(`You do not have permission to use subject "${subject}" for Class ${standard}-${section}`);
    }
};

const checkOwnership = (assignment, userId, role) => {
    if (role === USER_ROLES.TEACHER && assignment.createdBy.toString() !== userId.toString()) {
        throw new ForbiddenError("You can only modify your own assignments");
    }
};

const assertCanViewAssignment = async (assignment, schoolId, userId, role) => {
    if (isAdminRole(role)) {
        return;
    }

    if (role === USER_ROLES.TEACHER) {
        const classes = await getTeacherClasses(schoolId, userId);
        const hasAccess = classes.some(
            (entry) => entry.standard === assignment.standard && entry.section === assignment.section
        );

        if (!hasAccess) {
            throw new ForbiddenError("You do not have access to this assignment");
        }

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

export const createAssignment = async (schoolId, userId, role, body, files) => {
    let { standard, section, subject } = body;
    const dueDate = assertFutureDueDate(body.dueDate);

    if (!subject) {
        throw new BadRequestError("Subject is required");
    }

    if (role === USER_ROLES.TEACHER) {
        const scope = await getTeacherAssignmentScope(schoolId, userId);

        if (!standard || !section) {
            standard = scope.classes[0].standard;
            section = scope.classes[0].section;
        }

        assertTeacherAssignmentAccess(scope, standard, section, subject);
    }

    if (!standard || !section) {
        throw new BadRequestError("Standard and section are required");
    }

    const assignment = await Assignment.create({
        schoolId,
        createdBy: userId,
        title: body.title,
        description: body.description || "",
        subject,
        standard,
        section,
        dueDate,
        attachments: mapFiles(files),
        requiresSubmission: normalizeBoolean(body.requiresSubmission, false),
    });

    logger.info(`Assignment created: ${assignment._id}`);
    return formatAssignment(assignment.toObject());
};

export const listAssignments = async (schoolId, userId, role, platform, query = {}) => {
    const filter = { schoolId };

    if (role === USER_ROLES.TEACHER) {
        const scope = await getTeacherAssignmentScope(schoolId, userId);
        const allowedStandards = [...new Set(scope.classes.map((entry) => entry.standard))];

        if (query.standard && query.standard !== "all") {
            if (!allowedStandards.includes(query.standard)) {
                filter.standard = "unauthorized_selection";
            } else {
                filter.standard = query.standard;

                const allowedSections = scope.classes
                    .filter((entry) => entry.standard === query.standard)
                    .map((entry) => entry.section);

                if (query.section && query.section !== "all") {
                    if (!allowedSections.includes(query.section)) {
                        filter.section = "unauthorized_selection";
                    } else {
                        filter.section = query.section;
                    }
                } else {
                    filter.section = { $in: allowedSections };
                }
            }
        } else {
            filter.$or = scope.classes.map((entry) => ({
                standard: entry.standard,
                section: entry.section,
            }));
        }

        if (query.standard && query.standard !== "all" && query.section && query.section !== "all" && query.subject && query.subject !== "all") {
            assertTeacherAssignmentAccess(scope, query.standard, query.section, query.subject);
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
            filter.createdBy = query.teacherId;
        }
    }

    if (role !== USER_ROLES.STUDENT && query.status && query.status !== "all") {
        filter.status = query.status;
    }

    if (query.subject && query.subject !== "all") {
        filter.subject = query.subject;
    }

    if (query.search?.trim()) {
        const searchRegex = new RegExp(escapeRegExp(query.search.trim()), "i");
        filter.$and = [
            ...(filter.$and || []),
            {
                $or: [
                    { title: searchRegex },
                    { subject: searchRegex },
                    { description: searchRegex },
                ],
            },
        ];
    }

    const page = parseInt(query.page, 10) || 0;
    const pageSize = parseInt(query.pageSize, 10) || 25;
    const skip = page * pageSize;

    const [total, assignments] = await Promise.all([
        Assignment.countDocuments(filter),
        Assignment.find(filter)
            .populate("createdBy", "name email")
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

export const getAssignment = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .populate("createdBy", "name email")
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

export const updateAssignment = async (schoolId, assignmentId, userId, role, body, files) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    checkOwnership(assignment, userId, role);

    const nextStandard = body.standard ?? assignment.standard;
    const nextSection = body.section ?? assignment.section;
    const nextSubject = body.subject ?? assignment.subject;

    if (role === USER_ROLES.TEACHER) {
        const attemptedClassChange = (
            (body.standard !== undefined && body.standard !== assignment.standard) ||
            (body.section !== undefined && body.section !== assignment.section) ||
            (body.subject !== undefined && body.subject !== assignment.subject)
        );

        if (attemptedClassChange) {
            throw new ForbiddenError("Teachers cannot change class, section, or subject after creation");
        }
    }

    if (isAdminRole(role)) {
        assignment.standard = nextStandard;
        assignment.section = nextSection;
        assignment.subject = nextSubject;
    }

    if (body.dueDate !== undefined) {
        assignment.dueDate = assertFutureDueDate(body.dueDate);
    }

    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.requiresSubmission !== undefined) {
        assignment.requiresSubmission = normalizeBoolean(body.requiresSubmission, assignment.requiresSubmission);
    }
    if (body.status !== undefined) assignment.status = body.status;

    if (files?.length) {
        assignment.attachments.push(...mapFiles(files));
    }

    await assignment.save();
    logger.info(`Assignment updated: ${assignmentId}`);
    return formatAssignment(assignment.toObject());
};

export const deleteAssignment = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!isAdminRole(role)) {
        throw new ForbiddenError("Only admins can delete assignments");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    for (const attachment of assignment.attachments) {
        await deleteFromCloudinary(attachment.url);
    }

    const submissions = await Submission.find({ assignmentId }).lean();
    for (const submission of submissions) {
        for (const file of submission.files) {
            await deleteFromCloudinary(file.url);
        }
    }

    await Submission.deleteMany({ assignmentId });
    await Assignment.deleteOne({ _id: assignmentId });

    logger.info(`Assignment deleted with cascade: ${assignmentId}`);
};

export const removeAttachment = async (schoolId, assignmentId, userId, role, publicId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!publicId || typeof publicId !== "string") {
        throw new BadRequestError("Invalid attachment public ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    checkOwnership(assignment, userId, role);

    const attachmentIndex = assignment.attachments.findIndex((entry) => entry.publicId === publicId);
    if (attachmentIndex === -1) throw new NotFoundError("Attachment not found");

    const [attachment] = assignment.attachments.splice(attachmentIndex, 1);
    if (attachment?.url) {
        await deleteFromCloudinary(attachment.url);
    }

    await assignment.save();

    logger.info(`Attachment removed from assignment ${assignmentId}: ${publicId}`);
    return formatAssignment(assignment.toObject());
};

export const submitAssignment = async (schoolId, assignmentId, studentId, files) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    if (!files?.length) {
        throw new BadRequestError("A submission file is required");
    }

    if (files.length > 1) {
        throw new BadRequestError("Only one submission file is allowed");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (!assignment.requiresSubmission) {
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
        for (const file of existing.files) {
            await deleteFromCloudinary(file.url);
        }

        existing.files = mappedFiles;
        existing.isLate = isLate;
        existing.submittedAt = new Date();
        await existing.save();

        logger.info(`Re-submission for assignment ${assignmentId} by student ${studentId}`);
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
    return formatSubmission(submission.toObject());
};

export const getMySubmission = async (schoolId, assignmentId, studentId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!assignment) {
        throw new NotFoundError("Assignment not found");
    }

    await assertCanViewAssignment(assignment, schoolId, studentId, USER_ROLES.STUDENT);

    const submission = await Submission.findOne({ assignmentId, studentId, schoolId }).lean();
    return formatSubmission(submission);
};

export const listSubmissions = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .select("title subject standard section dueDate status createdBy requiresSubmission attachments")
        .lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (role === USER_ROLES.TEACHER && assignment.createdBy.toString() !== userId.toString()) {
        throw new ForbiddenError("You can only view submissions for your own assignments");
    }

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

export const getAssignmentMetadata = async (schoolId, userRole, userId) => {
    const isTeacher = userRole === USER_ROLES.TEACHER;

    let entries = [];
    let allTimetablesForAdmin = [];
    let profileClasses = [];
    let assignments = [];

    const { Timetable, TimetableEntry } = await import("../timetable/Timetable.model.js");

    if (isTeacher) {
        const scope = await getTeacherAssignmentScope(schoolId, userId);
        const teacherClassFilter = scope.classes.map(({ standard, section }) => ({ standard, section }));

        profileClasses = scope.profileClasses;
        entries = scope.entries;
        assignments = await Assignment.find({ schoolId, $or: teacherClassFilter })
            .select("standard section subject")
            .lean();
    } else {
        const [foundEntries, foundTimetables, foundAssignments] = await Promise.all([
            TimetableEntry.find({ schoolId })
                .populate({
                    path: "timetableId",
                    select: "standard section",
                })
                .lean(),
            Timetable.find({ schoolId }).lean(),
            Assignment.find({ schoolId })
                .select("standard section subject")
                .lean(),
        ]);

        entries = foundEntries;
        allTimetablesForAdmin = foundTimetables;
        assignments = foundAssignments;
    }

    const standards = new Set();
    const sections = new Set();
    const subjects = new Set();
    const mappings = {
        classSections: {},
        sectionSubjects: {},
    };

    profileClasses.forEach(({ standard, section, subjects: profileSubjects = [] }) => {
        if (!standard || !section) return;

        standards.add(standard);
        sections.add(section);

        if (!mappings.classSections[standard]) {
            mappings.classSections[standard] = new Set();
        }
        mappings.classSections[standard].add(section);

        const key = `${standard}-${section}`;
        if (!mappings.sectionSubjects[key]) {
            mappings.sectionSubjects[key] = new Set();
        }

        profileSubjects.forEach((subject) => {
            if (!subject) return;
            subjects.add(subject);
            mappings.sectionSubjects[key].add(subject);
        });
    });

    if (!isTeacher) {
        allTimetablesForAdmin.forEach((timetable) => {
            const standard = timetable.standard;
            const section = timetable.section;
            if (!standard || !section) return;

            standards.add(standard);
            sections.add(section);

            if (!mappings.classSections[standard]) {
                mappings.classSections[standard] = new Set();
            }
            mappings.classSections[standard].add(section);
        });
    }

    entries.forEach((entry) => {
        const standard = entry.timetableId?.standard;
        const section = entry.timetableId?.section;
        const subject = entry.subject;

        if (!standard || !section) return;

        standards.add(standard);
        sections.add(section);
        if (subject) subjects.add(subject);

        if (!mappings.classSections[standard]) {
            mappings.classSections[standard] = new Set();
        }
        mappings.classSections[standard].add(section);

        const key = `${standard}-${section}`;
        if (!mappings.sectionSubjects[key]) {
            mappings.sectionSubjects[key] = new Set();
        }
        if (subject) mappings.sectionSubjects[key].add(subject);
    });

    assignments.forEach(({ standard, section, subject }) => {
        if (!standard || !section) return;

        standards.add(standard);
        sections.add(section);

        if (!mappings.classSections[standard]) {
            mappings.classSections[standard] = new Set();
        }
        mappings.classSections[standard].add(section);

        const key = `${standard}-${section}`;
        if (!mappings.sectionSubjects[key]) {
            mappings.sectionSubjects[key] = new Set();
        }

        if (subject) {
            subjects.add(subject);
            mappings.sectionSubjects[key].add(subject);
        }
    });

    const result = {
        standards: Array.from(standards).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)),
        sections: Array.from(sections).sort(),
        subjects: Array.from(subjects).sort(),
        mappings: {
            classSections: {},
            sectionSubjects: {},
        },
    };

    Object.keys(mappings.classSections).forEach((standard) => {
        result.mappings.classSections[standard] = Array.from(mappings.classSections[standard]).sort();
    });

    Object.keys(mappings.sectionSubjects).forEach((key) => {
        result.mappings.sectionSubjects[key] = Array.from(mappings.sectionSubjects[key]).sort();
    });

    return result;
};

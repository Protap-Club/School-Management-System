import mongoose from "mongoose";
import { Assignment } from "./Assignment.model.js";
import { Submission } from "./Submission.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
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

export const createAssignment = async (schoolId, userId, body, files) => {
    const { subject } = body;
    const dueDate = assertFutureDueDate(body.dueDate);

    if (!subject) {
        throw new BadRequestError("Subject is required");
    }

    if (!body.standard || !body.section) {
        throw new BadRequestError("Standard and section are required");
    }

    const normalizedClassSection = await assertClassSectionConfigured(schoolId, body.standard, body.section);

    const assignment = await Assignment.create({
        schoolId,
        createdBy: userId,
        title: body.title,
        description: body.description || "",
        subject,
        standard: normalizedClassSection.standard,
        section: normalizedClassSection.section,
        dueDate,
        attachments: mapFiles(files),
        requiresSubmission: normalizeBoolean(body.requiresSubmission, false),
    });

    logger.info(`Assignment created: ${assignment._id}`);
    return formatAssignment(assignment.toObject());
};

export const listAssignments = async (schoolId, userId, role, query = {}) => {
    const filter = { schoolId };

    if (role === USER_ROLES.TEACHER || isAdminRole(role)) {
        if (query.standard && query.standard !== "all") filter.standard = query.standard;
        if (query.section && query.section !== "all") filter.section = query.section;
        if (query.teacherId && mongoose.Types.ObjectId.isValid(query.teacherId)) {
            filter.createdBy = query.teacherId;
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
        filter.$text = { $search: query.search.trim() };
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
                select: "title subject standard section dueDate status createdBy requiresSubmission attachments",
                populate: {
                    path: "createdBy",
                    select: "name email",
                },
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

    assertCanManageAssignment(role);

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (body.dueDate !== undefined) {
        assignment.dueDate = assertFutureDueDate(body.dueDate);
    }

    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.requiresSubmission !== undefined) {
        assignment.requiresSubmission = normalizeBoolean(body.requiresSubmission, assignment.requiresSubmission);
    }
    applyResolvedStatus(assignment, body.status);

    if (files?.length) {
        assignment.attachments.push(...mapFiles(files));
    }

    await assignment.save();
    logger.info(`Assignment updated: ${assignmentId}`);
    return formatAssignment(assignment.toObject());
};

export const deleteAssignment = async (schoolId, assignmentId, role) => {
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

export const removeAttachment = async (schoolId, assignmentId, role, publicId) => {
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
    if (attachment?.url) {
        await deleteFromCloudinary(attachment.url);
    }

    applyResolvedStatus(assignment);
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

    await closeExpiredAssignmentById(schoolId, assignmentId);

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
        .select("title subject standard section dueDate status createdBy requiresSubmission attachments")
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

export const getAssignmentMetadata = async (schoolId) => {
    const { classSections, keySet } = await getConfiguredClassSectionContext(schoolId);

    const standards = new Set();
    const sections = new Set();
    const subjects = new Set();
    const mappings = {
        classSections: {},
        sectionSubjects: {},
    };

    classSections.forEach(({ standard, section }) => {
        standards.add(standard);
        sections.add(section);

        if (!mappings.classSections[standard]) {
            mappings.classSections[standard] = new Set();
        }
        mappings.classSections[standard].add(section);

        const key = `${standard}-${section}`;
        mappings.sectionSubjects[key] = new Set();
    });

    const timetables = await Timetable.find({ schoolId })
        .select("_id standard section")
        .lean();

    const timetableClassMap = new Map();
    for (const timetable of timetables) {
        const normalized = normalizeClassSection(timetable);
        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!keySet.has(key)) continue;
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

        subjects.add(entry.subject);
        const mapKey = `${timetableClass.standard}-${timetableClass.section}`;
        mappings.sectionSubjects[mapKey]?.add(entry.subject);
    });

    assignments.forEach((assignment) => {
        const normalized = normalizeClassSection(assignment);
        if (!normalized.standard || !normalized.section || !assignment.subject) return;

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!keySet.has(key)) return;

        subjects.add(assignment.subject);
        const mapKey = `${normalized.standard}-${normalized.section}`;
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

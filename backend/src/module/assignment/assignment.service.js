import mongoose from "mongoose";
import { Assignment } from "./Assignment.model.js";
import { Submission } from "./Submission.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";

// ── Helpers ─────────────────────────────────────────────────────

// Maps multer-cloudinary file objects to our attachment sub-doc shape
const mapFiles = (files = []) =>
    files.map((f) => ({
        url: f.path || f.secure_url,
        publicId: f.filename || f.public_id,
        name: f.originalname,
    }));

// Resolves the teacher's assigned classes (standards + sections) from both Profile and Timetable
const getTeacherClasses = async (schoolId, userId) => {
    // Source 1: Teacher Profile (Primary assignments)
    const profile = await TeacherProfile.findOne({ schoolId, userId })
        .select("assignedClasses")
        .lean();

    const profileClasses = profile?.assignedClasses || [];

    // Source 2: Timetable (Dynamic schedule)
    const { TimetableEntry } = await import("../timetable/Timetable.model.js");
    const entries = await TimetableEntry.find({ schoolId, teacherId: userId })
        .populate({ path: 'timetableId', select: 'standard section' })
        .lean();

    const timetableClasses = entries.map(e => ({
        standard: e.timetableId?.standard,
        section: e.timetableId?.section
    })).filter(c => c.standard && c.section);

    // Merge and Deduplicate
    const allUnique = [];
    const seen = new Set();

    [...profileClasses, ...timetableClasses].forEach(c => {
        const key = `${c.standard}-${c.section}`;
        if (!seen.has(key)) {
            seen.add(key);
            allUnique.push({ standard: c.standard, section: c.section });
        }
    });

    if (allUnique.length === 0) {
        throw new BadRequestError("No classes assigned to this teacher");
    }
    return allUnique;
};

// Checks ownership — teachers can only modify their own assignments
const checkOwnership = (assignment, userId, role) => {
    if (role === USER_ROLES.TEACHER && assignment.createdBy.toString() !== userId.toString()) {
        throw new ForbiddenError("You can only modify your own assignments");
    }
};

// ── Assignment CRUD ─────────────────────────────────────────────

// Create a new assignment
export const createAssignment = async (schoolId, userId, role, body, files) => {
    let { standard, section } = body;

    // Teachers can specify class, but must be one of their assigned classes
    if (role === USER_ROLES.TEACHER) {
        const classes = await getTeacherClasses(schoolId, userId);
        
        // If teacher didn't specify, default to first class (legacy behavior/convenience)
        if (!standard || !section) {
            standard = classes[0].standard;
            section = classes[0].section;
        } else {
            // Validate requested class exists in their profile
            const hasAccess = classes.some(c => c.standard === standard && c.section === section);
            if (!hasAccess) {
                throw new ForbiddenError(`You do not have permission to create assignments for Class ${standard}-${section}`);
            }
        }
    }

    // Admins must provide standard and section
    if (!standard || !section) {
        throw new BadRequestError("Standard and section are required");
    }

    if (new Date(body.dueDate) <= new Date()) {
        throw new BadRequestError("Due date must be in the future");
    }

    const assignment = await Assignment.create({
        schoolId,
        createdBy: userId,
        title: body.title,
        description: body.description || "",
        subject: body.subject,
        standard,
        section,
        dueDate: body.dueDate,
        attachments: mapFiles(files),
    });

    logger.info(`Assignment created: ${assignment._id}`);
    return assignment;
};

// List assignments (role-scoped)
export const listAssignments = async (schoolId, userId, role, platform, query = {}) => {
    const filter = { schoolId };

    if (role === USER_ROLES.TEACHER) {
        const classes = await getTeacherClasses(schoolId, userId);
        const allowedStandards = [...new Set(classes.map(c => c.standard))];
        
        if (query.standard && query.standard !== "all") {
            if (!allowedStandards.includes(query.standard)) {
                filter.standard = "unauthorized_selection"; 
            } else {
                filter.standard = query.standard;
                
                // Filter sections based on selection
                const allowedSections = classes
                    .filter(c => c.standard === query.standard)
                    .map(c => c.section);
                
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
            // Default: Show everything teacher is assigned to
            filter.$or = classes.map(c => ({
                standard: c.standard,
                section: c.section
            }));
        }
    } else if (role === USER_ROLES.STUDENT) {
        const profile = await StudentProfile.findOne({ schoolId, userId }).lean();
        if (!profile) throw new NotFoundError("Student profile not found");
        filter.standard = profile.standard;
        filter.section = profile.section;
        filter.status = "active";
    } else {
        // Admin/Super Admin — optional query filters
        if (query.standard && query.standard !== "all") filter.standard = query.standard;
        if (query.section && query.section !== "all") filter.section = query.section;
        if (query.subject && query.subject !== "all") filter.subject = query.subject;
    }

    // Common optional filters for non-students
    if (role !== USER_ROLES.STUDENT) {
        if (query.status && query.status !== "all") filter.status = query.status;
    }

    const page = parseInt(query.page) || 0;
    const pageSize = parseInt(query.pageSize) || 25;
    const skip = page * pageSize;

    const [total, assignments] = await Promise.all([
        Assignment.countDocuments(filter),
        Assignment.find(filter)
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .lean()
    ]);

    // Attach submission flag for students
    let finalAssignments = assignments;
    if (role === USER_ROLES.STUDENT) {
        const assignmentIds = assignments.map((a) => a._id);
        const submissions = await Submission.find({
            assignmentId: { $in: assignmentIds },
            studentId: userId,
        })
            .select("assignmentId")
            .lean();

        const submittedSet = new Set(submissions.map((s) => s.assignmentId.toString()));
        finalAssignments = assignments.map((a) => ({
            ...a,
            submitted: submittedSet.has(a._id.toString()),
        }));
    }

    return {
        assignments: finalAssignments,
        pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        }
    };
};

// Get a single assignment by ID
export const getAssignment = async (schoolId, assignmentId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .populate("createdBy", "name email")
        .lean();

    if (!assignment) throw new NotFoundError("Assignment not found");
    return assignment;
};

// Update an assignment
export const updateAssignment = async (schoolId, assignmentId, userId, role, body, files) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    checkOwnership(assignment, userId, role);

    if (body.dueDate !== undefined && new Date(body.dueDate) <= new Date()) {
        throw new BadRequestError("Due date must be in the future");
    }

    if (body.title !== undefined) assignment.title = body.title;
    if (body.description !== undefined) assignment.description = body.description;
    if (body.dueDate !== undefined) assignment.dueDate = body.dueDate;
    if (body.status !== undefined) assignment.status = body.status;

    // Append new attachments if provided
    if (files?.length) {
        assignment.attachments.push(...mapFiles(files));
    }

    await assignment.save();
    logger.info(`Assignment updated: ${assignmentId}`);
    return assignment;
};

// Delete an assignment and cascade-clean submissions + Cloudinary files
export const deleteAssignment = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId });
    if (!assignment) throw new NotFoundError("Assignment not found");

    checkOwnership(assignment, userId, role);

    // Clean assignment attachments from Cloudinary
    for (const att of assignment.attachments) {
        await deleteFromCloudinary(att.publicId);
    }

    // Clean submission files from Cloudinary and delete submissions
    const submissions = await Submission.find({ assignmentId }).lean();
    for (const sub of submissions) {
        for (const file of sub.files) {
            await deleteFromCloudinary(file.publicId);
        }
    }
    await Submission.deleteMany({ assignmentId });
    await Assignment.deleteOne({ _id: assignmentId });

    logger.info(`Assignment deleted with cascade: ${assignmentId}`);
};

// Remove a single attachment from an assignment
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

    const attachmentIndex = assignment.attachments.findIndex((a) => a.publicId === publicId);
    if (attachmentIndex === -1) throw new NotFoundError("Attachment not found");

    await deleteFromCloudinary(publicId);
    assignment.attachments.splice(attachmentIndex, 1);
    await assignment.save();

    logger.info(`Attachment removed from assignment ${assignmentId}: ${publicId}`);
    return assignment;
};

// ── Submission ──────────────────────────────────────────────────

// Student submits (or re-submits) an assignment
export const submitAssignment = async (schoolId, assignmentId, studentId, files) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }
    if (!files?.length) {
        throw new BadRequestError("At least one file is required for submission");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId }).lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    if (assignment.status === "closed") {
        throw new BadRequestError("Assignment is closed for submissions");
    }

    // Validate student belongs to the same class as the assignment
    const profile = await StudentProfile.findOne({ schoolId, userId: studentId }).lean();
    if (!profile) throw new NotFoundError("Student profile not found");

    if (profile.standard !== assignment.standard || profile.section !== assignment.section) {
        throw new ForbiddenError("You are not in the class this assignment belongs to");
    }

    const isLate = new Date() > new Date(assignment.dueDate);
    const mappedFiles = mapFiles(files);

    // Check for existing submission (re-submission replaces old files)
    const existing = await Submission.findOne({ assignmentId, studentId });

    if (existing) {
        // Delete old files from Cloudinary before replacing
        for (const file of existing.files) {
            await deleteFromCloudinary(file.publicId);
        }
        existing.files = mappedFiles;
        existing.isLate = isLate;
        existing.submittedAt = new Date();
        await existing.save();
        logger.info(`Re-submission for assignment ${assignmentId} by student ${studentId}`);
        return existing;
    }

    const submission = await Submission.create({
        assignmentId,
        studentId,
        schoolId,
        files: mappedFiles,
        isLate,
    });

    logger.info(`Submission created for assignment ${assignmentId} by student ${studentId}`);
    return submission;
};

// Get a student's own submission for an assignment
export const getMySubmission = async (schoolId, assignmentId, studentId) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    // Return null if not found — student just hasn't submitted yet
    return await Submission.findOne({ assignmentId, studentId, schoolId }).lean();
};

// Teacher/admin view: all submissions merged with class roster
export const listSubmissions = async (schoolId, assignmentId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new BadRequestError("Invalid assignment ID");
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
        .select("title subject standard section dueDate status createdBy")
        .lean();
    if (!assignment) throw new NotFoundError("Assignment not found");

    // Teachers can only view submissions for assignments they created
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

    const studentUserIds = studentProfiles.map((p) => p.userId);

    const User = mongoose.model("User");
    const students = await User.find({
        _id: { $in: studentUserIds },
        isArchived: false,
    })
        .select("name email")
        .lean();

    // Build a rollNumber lookup from profiles
    const rollMap = new Map(studentProfiles.map((p) => [p.userId.toString(), p.rollNumber]));

    // Get all submissions for this assignment
    const submissions = await Submission.find({ assignmentId }).lean();
    const subMap = new Map(submissions.map((s) => [s.studentId.toString(), s]));

    // Merge student info with submission status
    const merged = students.map((s) => {
        const sub = subMap.get(s._id.toString());
        return {
            studentId: s._id,
            name: s.name,
            rollNumber: rollMap.get(s._id.toString()) || null,
            submitted: !!sub,
            ...(sub && {
                submittedAt: sub.submittedAt,
                isLate: sub.isLate,
                files: sub.files.map((f) => ({ url: f.url, name: f.name })),
            }),
        };
    });

    const submittedCount = merged.filter((s) => s.submitted).length;

    return {
        assignment,
        counts: {
            totalStudents: merged.length,
            submitted: submittedCount,
            pending: merged.length - submittedCount,
        },
        students: merged,
    };
};

// Gets unique standards, sections, and subjects available for assignment creation
export const getAssignmentMetadata = async (schoolId, userRole, userId) => {
    const isTeacher = userRole === USER_ROLES.TEACHER;

    let entries = [];
    let allTimetablesForAdmin = [];

    const { Timetable, TimetableEntry } = await import("../timetable/Timetable.model.js");

    if (isTeacher) {
        entries = await TimetableEntry.find({ schoolId, teacherId: userId })
            .populate({
                path: 'timetableId',
                select: 'standard section'
            })
            .lean();
    } else {
        // Admin: Get all scheduled entries (for subjects) AND all timetables (for full class list)
        const [foundEntries, foundTimetables] = await Promise.all([
            TimetableEntry.find({ schoolId })
                .populate({
                    path: 'timetableId',
                    select: 'standard section'
                })
                .lean(),
            Timetable.find({ schoolId }).lean()
        ]);
        entries = foundEntries;
        allTimetablesForAdmin = foundTimetables;
    }

    // Also fetch any existing subjects from assignments to ensure filter is populated for older data
    const existingSubjects = await Assignment.find({ schoolId }).distinct('subject');

    // Structured Metadata Building
    const standards = new Set();
    const sections = new Set();
    const subjects = new Set(existingSubjects);
    const mappings = {
        classSections: {}, // { "10": ["A", "B"] }
        sectionSubjects: {} // { "10-A": ["Math"], "10-B": ["Science"] }
    };

    // For Admins, ensure all Classes/Sections are represented even if they have no periods assigned
    if (!isTeacher) {
        allTimetablesForAdmin.forEach(tt => {
            const std = tt.standard;
            const sec = tt.section;
            if (!std || !sec) return;

            standards.add(std);
            sections.add(sec);
            if (!mappings.classSections[std]) {
                mappings.classSections[std] = new Set();
            }
            mappings.classSections[std].add(sec);
        });
    }

    entries.forEach(entry => {
        const std = entry.timetableId?.standard;
        const sec = entry.timetableId?.section;
        const sub = entry.subject;

        if (!std || !sec) return;

        standards.add(std);
        sections.add(sec);
        if (sub) subjects.add(sub);

        // Map Standard -> Sections
        if (!mappings.classSections[std]) {
            mappings.classSections[std] = new Set();
        }
        mappings.classSections[std].add(sec);

        // Map Section -> Subjects
        const key = `${std}-${sec}`;
        if (!mappings.sectionSubjects[key]) {
            mappings.sectionSubjects[key] = new Set();
        }
        if (sub) mappings.sectionSubjects[key].add(sub);
    });

    // Convert Sets to sorted Arrays
    const result = {
        standards: Array.from(standards).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)),
        sections: Array.from(sections).sort(),
        subjects: Array.from(subjects).sort(),
        mappings: {
            classSections: {},
            sectionSubjects: {}
        }
    };

    Object.keys(mappings.classSections).forEach(std => {
        result.mappings.classSections[std] = Array.from(mappings.classSections[std]).sort();
    });
    Object.keys(mappings.sectionSubjects).forEach(key => {
        result.mappings.sectionSubjects[key] = Array.from(mappings.sectionSubjects[key]).sort();
    });

    return result;
};

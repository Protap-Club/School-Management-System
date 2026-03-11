import Exam from "./Exam.model.js";
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
    // Role-based exam type enforcement
    if (user.role === USER_ROLES.TEACHER) {
        if (data.examType !== "CLASS_TEST") {
            throw new ForbiddenError("Teachers can only create CLASS_TEST exams");
        }
        await assertTeacherClassAccess(user._id, schoolId, data.standard, data.section);
    } else if (user.role === USER_ROLES.ADMIN) {
        if (data.examType !== "TERM_EXAM") {
            throw new ForbiddenError("Admins should create TERM_EXAM exams");
        }
    }

    // Check for duplicate
    const exists = await Exam.exists({
        schoolId,
        name: data.name,
        academicYear: data.academicYear,
        standard: data.standard,
        section: data.section,
        examType: data.examType,
    });

    if (exists) {
        throw new ConflictError(
            `Exam "${data.name}" already exists for ${data.standard}-${data.section} (${data.academicYear})`
        );
    }

    const exam = await Exam.create({
        schoolId,
        ...data,
        createdBy: user._id,
        createdByRole: user.role,
    });

    logger.info(
        `Exam created: ${exam._id} (${exam.examType}: "${exam.name}" for ${exam.standard}-${exam.section})`
    );
    return exam;
};

// ═══════════════════════════════════════════════════════════════
// GET EXAMS — Auto-filtered by role
// ═══════════════════════════════════════════════════════════════

export const getExams = async (schoolId, filters = {}, user) => {
    const query = { schoolId, isActive: true };

    // Role-based filtering
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({ userId: user._id, schoolId }).lean();
        if (!profile || !profile.assignedClasses?.length) return [];

        const classFilters = profile.assignedClasses.map((c) => ({
            standard: c.standard,
            section: c.section,
        }));
        query.$or = classFilters;
    } else if (user.role === USER_ROLES.STUDENT) {
        const profile = await StudentProfile.findOne({ userId: user._id, schoolId }).lean();
        if (!profile) return [];

        query.standard = profile.standard;
        query.section = profile.section;
        // Students only see published or completed exams
        query.status = { $in: ["PUBLISHED", "COMPLETED"] };
    }

    // Apply filters
    if (filters.examType) query.examType = filters.examType;
    if (filters.academicYear) query.academicYear = Number(filters.academicYear);
    if (filters.standard && user.role !== USER_ROLES.STUDENT) query.standard = filters.standard;
    if (filters.section && user.role !== USER_ROLES.STUDENT) query.section = filters.section;
    if (filters.status && user.role !== USER_ROLES.STUDENT) query.status = filters.status;

    return await Exam.find(query)
        .populate("createdBy", "name email")
        .populate("schedule.assignedTeacher", "name email")
        .sort({ createdAt: -1 })
        .lean();
};

// ═══════════════════════════════════════════════════════════════
// GET EXAM BY ID — With role-based access check
// ═══════════════════════════════════════════════════════════════

export const getExamById = async (schoolId, examId, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true })
        .populate("createdBy", "name email")
        .populate("schedule.assignedTeacher", "name email")
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

    // Access check for student
    if (user.role === USER_ROLES.STUDENT) {
        if (!["PUBLISHED", "COMPLETED"].includes(exam.status)) {
            throw new NotFoundError("Exam not found");
        }
        const profile = await StudentProfile.findOne({ userId: user._id, schoolId }).lean();
        if (!profile || profile.standard !== exam.standard || profile.section !== exam.section) {
            throw new ForbiddenError("You don't have access to this exam");
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

    // Permission check
    if (user.role === USER_ROLES.TEACHER) {
        if (exam.examType !== "CLASS_TEST" || String(exam.createdBy) !== String(user._id)) {
            throw new ForbiddenError("You can only update your own class tests");
        }
        await assertTeacherClassAccess(user._id, schoolId, exam.standard, exam.section);
    } else if (user.role === USER_ROLES.ADMIN) {
        if (exam.examType !== "TERM_EXAM") {
            throw new ForbiddenError("Admins can only update term exams");
        }
    }

    // Can only update DRAFT or PUBLISHED exams
    if (["COMPLETED", "CANCELLED"].includes(exam.status)) {
        throw new BadRequestError(`Cannot update a ${exam.status.toLowerCase()} exam`);
    }

    // Apply safe updates (don't allow changing examType, standard, section, academicYear)
    if (data.name !== undefined) exam.name = data.name;
    if (data.category !== undefined) exam.category = data.category;
    if (data.description !== undefined) exam.description = data.description;
    if (data.schedule !== undefined) exam.schedule = data.schedule;

    await exam.save();
    logger.info(`Exam updated: ${examId}`);
    return exam;
};

// ═══════════════════════════════════════════════════════════════
// DELETE EXAM — DRAFT status only
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

    if (exam.status !== "DRAFT") {
        throw new BadRequestError("Only DRAFT exams can be deleted. Cancel it instead.");
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

export const updateStatus = async (schoolId, examId, newStatus, user) => {
    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) throw new NotFoundError("Exam not found");

    // Permission check
    if (user.role === USER_ROLES.TEACHER) {
        if (exam.examType !== "CLASS_TEST" || String(exam.createdBy) !== String(user._id)) {
            throw new ForbiddenError("You can only change status of your own class tests");
        }
    } else if (user.role === USER_ROLES.ADMIN) {
        if (exam.examType !== "TERM_EXAM") {
            throw new ForbiddenError("Admins can only change status of term exams");
        }
    }

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
        .populate("createdBy", "name email")
        .populate("schedule.assignedTeacher", "name email")
        .sort({ createdAt: -1 })
        .lean();

    // Split into two sections
    const termExams = exams.filter((e) => e.examType === "TERM_EXAM");
    const classTests = exams.filter((e) => e.examType === "CLASS_TEST");

    return { termExams, classTests };
};

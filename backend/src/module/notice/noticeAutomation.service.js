import { Notice } from "./Notice.model.js";
import User from "../user/model/User.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";

const DEFAULT_AUDIENCE = Object.freeze({
    includeClassTeacher: true,
    includeSubjectTeachers: true,
    includeAdmins: true,
    includeStudents: true,
});

const normalizeSubjectKey = (value) => String(value || "").trim().toLowerCase();

const normalizeClassContext = (classContext = {}) => {
    const standard = String(classContext.standard || "").trim();
    const section = String(classContext.section || "").trim().toUpperCase();
    const academicYear =
        classContext.academicYear !== undefined && classContext.academicYear !== null
            ? Number(classContext.academicYear)
            : undefined;

    return {
        standard,
        section,
        ...(Number.isFinite(academicYear) ? { academicYear } : {}),
    };
};

const resolveAudienceOptions = (audience = {}) => ({
    ...DEFAULT_AUDIENCE,
    ...(audience || {}),
});

const resolveActiveTeacherIds = async (schoolId) => {
    const teachers = await User.find({
        schoolId,
        role: USER_ROLES.TEACHER,
        isActive: true,
        isArchived: false,
    })
        .select("_id")
        .lean();

    return new Set(teachers.map((teacher) => String(teacher._id)));
};

export const resolveAcademicNoticeAudience = async ({
    schoolId,
    classContext,
    subjects = [],
    audience = {},
}) => {
    const normalizedClass = normalizeClassContext(classContext);
    const options = resolveAudienceOptions(audience);
    const normalizedSubjects = new Set(
        (Array.isArray(subjects) ? subjects : [])
            .map(normalizeSubjectKey)
            .filter(Boolean)
    );

    if (!normalizedClass.standard || !normalizedClass.section) {
        return {
            recipientIds: [],
            breakdown: {
                classTeacherCount: 0,
                subjectTeacherCount: 0,
                adminCount: 0,
                studentCount: 0,
            },
        };
    }

    const recipientIds = new Set();
    const breakdown = {
        classTeacherCount: 0,
        subjectTeacherCount: 0,
        adminCount: 0,
        studentCount: 0,
    };

    const shouldResolveTeachers = options.includeClassTeacher || options.includeSubjectTeachers;
    const activeTeacherIds = shouldResolveTeachers
        ? await resolveActiveTeacherIds(schoolId)
        : new Set();

    if (options.includeClassTeacher && activeTeacherIds.size > 0) {
        const classTeacherProfile = await TeacherProfile.findOne({
            schoolId,
            userId: { $in: [...activeTeacherIds] },
            "classTeacherOf.standard": normalizedClass.standard,
            "classTeacherOf.section": normalizedClass.section,
        })
            .select("userId")
            .lean();

        if (classTeacherProfile?.userId) {
            recipientIds.add(String(classTeacherProfile.userId));
            breakdown.classTeacherCount = 1;
        }
    }

    if (options.includeSubjectTeachers && activeTeacherIds.size > 0 && normalizedSubjects.size > 0) {
        const teacherProfiles = await TeacherProfile.find({
            schoolId,
            userId: { $in: [...activeTeacherIds] },
            assignedClasses: {
                $elemMatch: {
                    standard: normalizedClass.standard,
                    section: normalizedClass.section,
                },
            },
        })
            .select("userId assignedClasses")
            .lean();

        const matchedTeacherIds = new Set();

        for (const profile of teacherProfiles) {
            const matchesSubject = (profile.assignedClasses || []).some((assignedClass) => {
                if (
                    String(assignedClass?.standard || "").trim() !== normalizedClass.standard ||
                    String(assignedClass?.section || "").trim().toUpperCase() !== normalizedClass.section
                ) {
                    return false;
                }

                const assignedSubjects = Array.isArray(assignedClass?.subjects)
                    ? assignedClass.subjects.map(normalizeSubjectKey).filter(Boolean)
                    : [];

                return assignedSubjects.some((subject) => normalizedSubjects.has(subject));
            });

            if (matchesSubject && profile?.userId) {
                matchedTeacherIds.add(String(profile.userId));
            }
        }

        matchedTeacherIds.forEach((teacherId) => recipientIds.add(teacherId));
        breakdown.subjectTeacherCount = matchedTeacherIds.size;
    }

    if (options.includeAdmins) {
        const adminUsers = await User.find({
            schoolId,
            role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
            isActive: true,
            isArchived: false,
        })
            .select("_id")
            .lean();

        adminUsers.forEach((admin) => recipientIds.add(String(admin._id)));
        breakdown.adminCount = adminUsers.length;
    }

    if (options.includeStudents) {
        const studentProfiles = await StudentProfile.find({
            schoolId,
            standard: normalizedClass.standard,
            section: normalizedClass.section,
        })
            .select("userId")
            .lean();

        const studentIds = studentProfiles
            .map((profile) => String(profile.userId || ""))
            .filter(Boolean);

        if (studentIds.length > 0) {
            const activeStudents = await User.find({
                schoolId,
                _id: { $in: studentIds },
                role: USER_ROLES.STUDENT,
                isActive: true,
                isArchived: false,
            })
                .select("_id")
                .lean();

            activeStudents.forEach((student) => recipientIds.add(String(student._id)));
            breakdown.studentCount = activeStudents.length;
        }
    }

    return {
        recipientIds: [...recipientIds],
        breakdown,
    };
};

export const createAutomatedAcademicNotice = async ({
    schoolId,
    createdBy,
    title,
    message,
    sourceType,
    sourceId,
    noticeCategory,
    classContext,
    subjects = [],
    audience = {},
    attachments = [],
    type = "notice",
    requiresAcknowledgment = false,
}) => {
    const normalizedClass = normalizeClassContext(classContext);
    const normalizedAttachments = Array.isArray(attachments) ? attachments : [];

    const { recipientIds, breakdown } = await resolveAcademicNoticeAudience({
        schoolId,
        classContext: normalizedClass,
        subjects,
        audience,
    });

    if (recipientIds.length === 0) {
        logger.warn(
            `Automated notice skipped because no recipients were resolved for ${noticeCategory || sourceType || "notice"}`
        );

        return {
            notice: null,
            recipientCount: 0,
            breakdown,
        };
    }

    const notice = await Notice.create({
        schoolId,
        createdBy,
        title,
        message,
        recipientType: "users",
        recipients: recipientIds,
        type,
        attachments: normalizedAttachments,
        status: "sent",
        requiresAcknowledgment,
        sourceType: sourceType || null,
        sourceId: sourceId || null,
        noticeCategory: noticeCategory || null,
        classContext:
            normalizedClass.standard && normalizedClass.section
                ? normalizedClass
                : null,
    });

    return {
        notice,
        recipientCount: recipientIds.length,
        breakdown,
    };
};

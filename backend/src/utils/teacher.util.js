import User from "../module/user/model/User.model.js";
import TeacherProfile from "../module/user/model/TeacherProfile.model.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { buildClassSectionKey, normalizeClassSection } from "./classSection.util.js";
import { BadRequestError, ConflictError, NotFoundError } from "./customError.js";

export const formatClassSectionLabel = ({ standard, section } = {}) =>
    `${String(standard || "").trim()}-${String(section || "").trim().toUpperCase()}`;

export const normalizeTeacherAssignedClasses = (items = []) => {
    if (!Array.isArray(items)) {
        throw new BadRequestError("Teacher assigned classes must be an array");
    }

    const uniqueByKey = new Map();

    items.forEach((item) => {
        const normalized = normalizeClassSection(item);
        if (!normalized.standard || !normalized.section) {
            return;
        }

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        const subjects = Array.from(
            new Set(
                (Array.isArray(item?.subjects) ? item.subjects : [])
                    .map((subject) => String(subject || "").trim())
                    .filter(Boolean)
            )
        );

        if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, {
                standard: normalized.standard,
                section: normalized.section,
                subjects,
            });
            return;
        }

        const existing = uniqueByKey.get(key);
        existing.subjects = Array.from(new Set([...(existing.subjects || []), ...subjects]));
    });

    return [...uniqueByKey.values()];
};

export const mergeTeacherAssignedClasses = (existing = [], incoming = []) =>
    normalizeTeacherAssignedClasses([...(existing || []), ...(incoming || [])]);

export const ensureActiveTeacher = async (schoolId, teacherId, options = {}) => {
    const { message = "Replacement teacher not found or is inactive" } = options;

    if (!teacherId) {
        throw new BadRequestError("Teacher ID is required");
    }

    const teacher = await User.findOne({
        _id: teacherId,
        schoolId,
        role: USER_ROLES.TEACHER,
        isArchived: false,
        isActive: true,
    })
        .select("_id name email")
        .lean();

    if (!teacher) {
        throw new NotFoundError(message);
    }

    return teacher;
};

export const findTeacherClassConflicts = async (
    schoolId,
    classSections = [],
    options = {}
) => {
    const { excludeUserIds = [] } = options;
    const normalizedClasses = normalizeTeacherAssignedClasses(classSections);

    if (normalizedClasses.length === 0) {
        return [];
    }

    const requestedKeys = new Set(
        normalizedClasses.map((item) => buildClassSectionKey(item.standard, item.section))
    );

    const profiles = await TeacherProfile.find({
        schoolId,
        ...(excludeUserIds.length > 0 ? { userId: { $nin: excludeUserIds } } : {}),
    })
        .select("userId assignedClasses")
        .lean();

    if (profiles.length === 0) {
        return [];
    }

    const activeTeachers = await User.find({
        _id: { $in: profiles.map((profile) => profile.userId) },
        schoolId,
        role: USER_ROLES.TEACHER,
        isArchived: false,
        isActive: true,
    })
        .select("name")
        .lean();

    const activeTeacherMap = new Map(
        activeTeachers.map((teacher) => [String(teacher._id), teacher])
    );

    const conflicts = [];
    const seenPairs = new Set();

    profiles.forEach((profile) => {
        const teacher = activeTeacherMap.get(String(profile.userId));
        if (!teacher) {
            return;
        }

        normalizeTeacherAssignedClasses(profile.assignedClasses || []).forEach((assignedClass) => {
            const classKey = buildClassSectionKey(assignedClass.standard, assignedClass.section);
            const seenKey = `${String(profile.userId)}::${classKey}`;
            if (!requestedKeys.has(classKey) || seenPairs.has(seenKey)) {
                return;
            }

            seenPairs.add(seenKey);
            conflicts.push({
                teacherId: profile.userId,
                teacherName: teacher.name,
                standard: assignedClass.standard,
                section: assignedClass.section,
                classLabel: formatClassSectionLabel(assignedClass),
            });
        });
    });

    return conflicts;
};

export const assertTeacherClassAssignmentsAvailable = async (
    schoolId,
    classSections = [],
    options = {}
) => {
    const conflicts = await findTeacherClassConflicts(schoolId, classSections, options);

    if (conflicts.length > 0) {
        const firstConflict = conflicts[0];
        throw new ConflictError(
            `Class ${firstConflict.classLabel} is already assigned to ${firstConflict.teacherName}`,
            "CLASS_TEACHER_ALREADY_ASSIGNED",
            { conflicts }
        );
    }

    return normalizeTeacherAssignedClasses(classSections);
};

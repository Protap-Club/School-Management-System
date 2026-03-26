import School from "./School.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { Timetable, TimetableEntry } from "../timetable/Timetable.model.js";
import { Notice } from "../notice/Notice.model.js";
import { isValidFeatureKey, SCHOOL_FEATURES } from "../../constants/featureFlags.js";
import { ConflictError, NotFoundError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { getIO } from "../../socket.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import {
    buildClassSectionKey,
    normalizeClassSection,
    sortClassSections,
} from "../../utils/classSection.util.js";

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REMOVED_CLASS_MARKER_REGEX = /\(removed\b/i;
const CLASS_STANDARD_REGEX = /^[A-Za-z0-9_]+$/;
const CLASS_SECTION_REGEX = /^[A-Za-z0-9_]+$/;

const isActiveLegacyClassSection = (item = {}) => {
    const normalized = normalizeClassSection(item);
    if (!normalized.standard || !normalized.section) return false;
    if (REMOVED_CLASS_MARKER_REGEX.test(normalized.standard)) return false;
    return normalized;
};

const collectLegacyClassSections = async (schoolId) => {
    const [studentProfiles, teacherProfiles, timetables] = await Promise.all([
        StudentProfile.find({ schoolId }).select("standard section").lean(),
        TeacherProfile.find({ schoolId }).select("assignedClasses").lean(),
        Timetable.find({ schoolId }).select("standard section").lean(),
    ]);

    const uniqueByKey = new Map();
    const addPair = (pair) => {
        const normalized = isActiveLegacyClassSection(pair);
        if (!normalized) return;

        const key = buildClassSectionKey(normalized.standard, normalized.section);
        if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, normalized);
        }
    };

    studentProfiles.forEach((profile) => addPair(profile));
    teacherProfiles.forEach((profile) => {
        (profile.assignedClasses || []).forEach((assignedClass) => addPair(assignedClass));
    });
    timetables.forEach((timetable) => addPair(timetable));

    return sortClassSections([...uniqueByKey.values()]);
};

const hydrateConfiguredClassSections = async (schoolId) => {
    const school = await School.findById(schoolId).select("academic.classSections");
    if (!school) {
        throw new NotFoundError("School not found");
    }

    const configured = sortClassSections(
        (school.academic?.classSections || [])
            .map((item) => normalizeClassSection(item))
            .filter((item) => item.standard && item.section)
    );
    const uniqueByKey = new Map(
        configured.map((item) => [buildClassSectionKey(item.standard, item.section), item])
    );

    const legacyPairs = await collectLegacyClassSections(schoolId);
    let hasChanges = false;
    let addedCount = 0;

    legacyPairs.forEach((pair) => {
        const key = buildClassSectionKey(pair.standard, pair.section);
        if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, pair);
            hasChanges = true;
            addedCount += 1;
        }
    });

    if (!hasChanges) {
        return sortClassSections([...uniqueByKey.values()]);
    }

    const merged = sortClassSections([...uniqueByKey.values()]);
    school.academic = school.academic || {};
    school.academic.classSections = merged;
    school.markModified("academic.classSections");
    await school.save();

    logger.info(
        `Hydrated Settings class catalog for school ${schoolId} with ${addedCount} recovered class-section pair(s)`
    );

    return merged;
};

const emitSchoolClassesChanged = async (schoolId, action, changed) => {
    try {
        const snapshot = await getSchoolClasses(schoolId);
        const payload = {
            schoolId: String(schoolId),
            action,
            changed,
            ...snapshot,
            version: new Date().toISOString(),
        };

        const io = getIO();
        io.to(`school-${schoolId}`).emit("school:classes:changed", payload);

        if (action === "created") {
            io.to(`school-${schoolId}`).emit("class:created", payload);
        }

        if (action === "deleted") {
            io.to(`school-${schoolId}`).emit("class:deleted", payload);
        }

        return snapshot;
    } catch (err) {
        logger.warn(`Socket emit failed (school:classes:changed): ${err.message}`);
        return getSchoolClasses(schoolId);
    }
};

// Creates a school. 
export const createSchool = async (creatorId, schoolData) => {
    const exists = await School.exists({ code: schoolData.code.toUpperCase() });
    if (exists) throw new ConflictError("School code already exists");

    const newSchool = await School.create({
        ...schoolData,
        code: schoolData.code.toUpperCase(),
        createdBy: creatorId
    });

    const data = {
        name: newSchool.name,
        isActive: newSchool.isActive,
        code: newSchool.code,
        schoolId: newSchool._id,
        _id: newSchool._id,
    }

    logger.info(`School Created: ${newSchool.name}`);
    return { school: data };
};


// Updates School Settings (Address, Contact info, etc.)
export const updateSchool = async (schoolId, updateData) => {
    // Only allow updating safe fields. Code and Features are protected.
    const allowedUpdates = {};
    if (updateData.name) allowedUpdates.name = updateData.name;
    if (updateData.address) allowedUpdates.address = updateData.address;
    if (updateData.contactEmail) allowedUpdates.contactEmail = updateData.contactEmail;
    if (updateData.contactPhone) allowedUpdates.contactPhone = updateData.contactPhone;
    if (updateData.theme) allowedUpdates.theme = updateData.theme;

    const updated = await School.findByIdAndUpdate(schoolId, allowedUpdates, { new: true, runValidators: true });
    if (!updated) throw new NotFoundError("School not found");

    const data = {
        name: updated.name,
        isActive: updated.isActive,
        code: updated.code,
        schoolId: updated._id,
        _id: updated._id,
    }

    return { school: data };
};

// Gets the "Profile" of the school. 
export const getSchoolProfile = async (schoolId) => {
    // Safety: ensure we actually have an ID to look for
    if (!schoolId) throw new BadRequestError("School context required");

    const school = await School.findById(schoolId).lean();
    if (!school) throw new NotFoundError("School not found");

    const data = {
        name: school.name,
        isActive: school.isActive,
        code: school.code,
        logoUrl: school.logoUrl,
        theme: school.theme,
        features: school.features,
        schoolId: school._id,
        _id: school._id,
    };

    return { school: data };
};

// BRANDING (Logo)
export const getSchoolBranding = async (schoolId) => {
    // If no context , return default
    const defaultBranding = { name: "Protap Club", logoUrl: null, theme: { accentColor: "#2563eb" } };
    if (!schoolId) return { branding: defaultBranding };

    const school = await School.findById(schoolId).select('name logoUrl theme').lean();
    return { branding: school || defaultBranding };
};

export const updateLogo = async (schoolId, logoUrl, logoPublicId) => {
    const school = await School.findById(schoolId);
    if (!school) throw new NotFoundError("School not found");

    const oldLogoPublicId = school.logoPublicId || school.logoUrl;
    school.logoUrl = logoUrl;
    school.logoPublicId = logoPublicId;
    
    await school.save();

    if (oldLogoPublicId) await deleteFromCloudinary(oldLogoPublicId);

    return { logoUrl: school.logoUrl };
};

// FEATURE MANAGEMENT 
export const getAvailableFeatures = () => Object.values(SCHOOL_FEATURES);

// In-memory cache for feature flags (60-second TTL)
const featureCache = new Map();
const FEATURE_CACHE_TTL_MS = 60_000;

// The Super Admin calls this to turn on/off features for THEIR school.
export const updateSchoolFeatures = async (schoolId, featureUpdates) => {
    const school = await School.findById(schoolId);
    if (!school) throw new NotFoundError("School not found");

    // Validate and Apply
    for (const key of Object.keys(featureUpdates)) {
        if (!isValidFeatureKey(key)) throw new BadRequestError(`Invalid feature key: ${key}`);
        school.features[key] = Boolean(featureUpdates[key]);
    }

    school.markModified('features');
    await school.save();

    // Invalidate all cached features for this school
    for (const cacheKey of featureCache.keys()) {
        if (cacheKey.startsWith(`${schoolId}:`)) {
            featureCache.delete(cacheKey);
        }
    }

    return { features: school.features };
};

export const hasFeature = async (schoolId, featureKey) => {
    if (!schoolId) return false;

    const cacheKey = `${schoolId}:${featureKey}`;
    const cached = featureCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < FEATURE_CACHE_TTL_MS) {
        return cached.value;
    }

    const school = await School.findById(schoolId).select(`features.${featureKey}`).lean();
    const value = school?.features?.[featureKey] === true;
    featureCache.set(cacheKey, { value, ts: Date.now() });
    return value;
};

export const addSchoolClassSection = async (schoolId, data) => {
    const school = await School.findById(schoolId).select("academic.classSections");
    if (!school) throw new NotFoundError("School not found");

    const normalized = normalizeClassSection(data);
    if (!normalized.standard || !normalized.section) {
        throw new BadRequestError("Class and section are required");
    }
    if (!CLASS_STANDARD_REGEX.test(normalized.standard)) {
        throw new BadRequestError("Class must be alphanumeric (letters, numbers, underscore only)");
    }
    if (!CLASS_SECTION_REGEX.test(normalized.section)) {
        throw new BadRequestError("Section must be alphanumeric (letters, numbers, underscore only)");
    }

    const existing = school.academic?.classSections || [];
    const alreadyExists = existing.some(
        (item) =>
            String(item.standard).trim().toLowerCase() === normalized.standard.toLowerCase() &&
            String(item.section).trim().toUpperCase() === normalized.section
    );

    if (alreadyExists) {
        throw new ConflictError(`Class ${normalized.standard} - ${normalized.section} already exists`);
    }

    school.academic = school.academic || { classSections: [] };
    school.academic.classSections.push(normalized);
    school.markModified("academic.classSections");
    await school.save();

    return emitSchoolClassesChanged(schoolId, "created", normalized);
};

export const removeSchoolClassSection = async (schoolId, data) => {
    const school = await School.findById(schoolId).select("academic.classSections");
    if (!school) throw new NotFoundError("School not found");

    const normalized = normalizeClassSection(data);
    if (!normalized.standard || !normalized.section) {
        throw new BadRequestError("Class and section are required");
    }

    const existing = school.academic?.classSections || [];
    const next = existing.filter(
        (item) =>
            !(
                String(item.standard).trim().toLowerCase() === normalized.standard.toLowerCase() &&
                String(item.section).trim().toUpperCase() === normalized.section
            )
    );

    if (next.length === existing.length) {
        throw new NotFoundError(`Class ${normalized.standard} - ${normalized.section} not found`);
    }

    const transferTo = normalizeClassSection(data?.transferTo);
    const hasTransfer = Boolean(transferTo.standard && transferTo.section);
    const teacherTransferTo = normalizeClassSection(data?.teacherTransferTo);
    const hasTeacherTransfer = Boolean(teacherTransferTo.standard && teacherTransferTo.section);
    const teacherAction = String(data?.teacherAction || "").trim().toLowerCase();
    const shouldUnassignTeachers = teacherAction === "unassign";

    const standardRegex = new RegExp(`^${escapeRegex(normalized.standard)}$`, "i");
    const sectionRegex = new RegExp(`^${escapeRegex(normalized.section)}$`, "i");

    const [studentCount, teacherCount] = await Promise.all([
        StudentProfile.countDocuments({
            schoolId,
            standard: standardRegex,
            section: sectionRegex,
        }),
        TeacherProfile.countDocuments({
            schoolId,
            assignedClasses: {
                $elemMatch: { standard: standardRegex, section: sectionRegex }
            }
        }),
    ]);

    if (studentCount > 0) {
        if (!hasTransfer) {
            throw new BadRequestError(
                "This class still has students. Before deleting, please assign them to a temporary class to avoid leaving anyone unassigned.",
                "CLASS_NOT_EMPTY",
                { studentCount, teacherCount }
            );
        }

        const transferKey = buildClassSectionKey(transferTo.standard, transferTo.section);
        const currentKey = buildClassSectionKey(normalized.standard, normalized.section);
        if (transferKey === currentKey) {
            throw new BadRequestError("Temporary class must be different from the class being deleted", "INVALID_TRANSFER_CLASS");
        }

        const configuredKeys = new Set(
            existing.map((item) => buildClassSectionKey(item.standard, item.section))
        );
        if (!configuredKeys.has(transferKey)) {
            throw new BadRequestError(
                "Selected temporary class-section is not configured in Settings",
                "INVALID_TRANSFER_CLASS"
            );
        }
    }

    if (teacherCount > 0 && !hasTeacherTransfer && !shouldUnassignTeachers) {
        throw new BadRequestError(
            "This class has assigned teachers. Please reassign them to another class or continue to mark them as unassigned.",
            "CLASS_HAS_TEACHERS",
            { teacherCount }
        );
    }

    if (hasTeacherTransfer) {
        const teacherTransferKey = buildClassSectionKey(teacherTransferTo.standard, teacherTransferTo.section);
        const currentKey = buildClassSectionKey(normalized.standard, normalized.section);
        if (teacherTransferKey === currentKey) {
            throw new BadRequestError(
                "Teacher reassignment class must be different from the class being deleted",
                "INVALID_TEACHER_TRANSFER_CLASS"
            );
        }

        const configuredKeys = new Set(
            existing.map((item) => buildClassSectionKey(item.standard, item.section))
        );
        if (!configuredKeys.has(teacherTransferKey)) {
            throw new BadRequestError(
                "Selected teacher reassignment class-section is not configured in Settings",
                "INVALID_TEACHER_TRANSFER_CLASS"
            );
        }
    }

    school.academic = school.academic || {};
    school.academic.classSections = next;
    school.markModified("academic.classSections");
    await school.save();

    const removedStandardLabel = `${normalized.standard} (REMOVED ${normalized.section})`;
    const removedRecipientValue = `${normalized.standard}-${normalized.section}`;

    const timetablesToDelete = await Timetable.find({
        schoolId,
        standard: standardRegex,
        section: sectionRegex,
    })
        .select("_id")
        .lean();
    const timetableIds = timetablesToDelete.map((item) => item._id);

    const studentCleanupPromise = studentCount > 0 && hasTransfer
        ? StudentProfile.updateMany(
            { schoolId, standard: standardRegex, section: sectionRegex },
            { $set: { standard: transferTo.standard, section: transferTo.section } }
        )
        : StudentProfile.updateMany(
            { schoolId, standard: standardRegex, section: sectionRegex },
            { $set: { standard: removedStandardLabel, section: "" } }
        );

    let teacherCleanupResult = { modifiedCount: 0 };
    if (teacherCount > 0) {
        if (hasTeacherTransfer) {
            const teacherStandardRegex = new RegExp(`^${escapeRegex(teacherTransferTo.standard)}$`, "i");
            const teacherSectionRegex = new RegExp(`^${escapeRegex(teacherTransferTo.section)}$`, "i");

            const teachersWithTarget = await TeacherProfile.updateMany(
                {
                    schoolId,
                    assignedClasses: {
                        $all: [
                            { $elemMatch: { standard: standardRegex, section: sectionRegex } },
                            { $elemMatch: { standard: teacherStandardRegex, section: teacherSectionRegex } }
                        ]
                    }
                },
                { $pull: { assignedClasses: { standard: standardRegex, section: sectionRegex } } }
            );

            const teachersWithoutTarget = await TeacherProfile.updateMany(
                {
                    schoolId,
                    assignedClasses: { $elemMatch: { standard: standardRegex, section: sectionRegex } },
                    $nor: [{ assignedClasses: { $elemMatch: { standard: teacherStandardRegex, section: teacherSectionRegex } } }]
                },
                {
                    $set: {
                        "assignedClasses.$[cls].standard": teacherTransferTo.standard,
                        "assignedClasses.$[cls].section": teacherTransferTo.section
                    }
                },
                { arrayFilters: [{ "cls.standard": standardRegex, "cls.section": sectionRegex }] }
            );

            teacherCleanupResult = {
                modifiedCount: (teachersWithTarget.modifiedCount || 0) + (teachersWithoutTarget.modifiedCount || 0)
            };
        } else {
            teacherCleanupResult = await TeacherProfile.updateMany(
                { schoolId },
                { $pull: { assignedClasses: { standard: standardRegex, section: sectionRegex } } }
            );
        }
    }

    const [studentCleanupResult, noticeCleanupResult] = await Promise.all([
        studentCleanupPromise,
        Notice.updateMany(
            { schoolId, recipientType: "classes" },
            { $pull: { recipients: removedRecipientValue } }
        ),
    ]);

    let timetableEntriesDeleted = 0;
    let timetablesDeleted = 0;
    if (timetableIds.length > 0) {
        const [entryCleanupResult, timetableCleanupResult] = await Promise.all([
            TimetableEntry.deleteMany({ schoolId, timetableId: { $in: timetableIds } }),
            Timetable.deleteMany({ schoolId, _id: { $in: timetableIds } }),
        ]);

        timetableEntriesDeleted = entryCleanupResult.deletedCount || 0;
        timetablesDeleted = timetableCleanupResult.deletedCount || 0;
    }

    const snapshot = await emitSchoolClassesChanged(schoolId, "deleted", normalized);
    const cleanup = {
        teachersUpdated: teacherCleanupResult.modifiedCount || 0,
        studentsUnassigned: studentCleanupResult.modifiedCount || 0,
        noticesUpdated: noticeCleanupResult.modifiedCount || 0,
        timetableEntriesDeleted,
        timetablesDeleted,
    };

    logger.info(
        `Class-section cleanup done for ${normalized.standard}-${normalized.section}. ` +
        `Teachers updated: ${cleanup.teachersUpdated}, students unassigned: ${cleanup.studentsUnassigned}, ` +
        `notices updated: ${cleanup.noticesUpdated}, timetables deleted: ${cleanup.timetablesDeleted}`
    );

    return { ...snapshot, cleanup };
};

// Gets unique standards, sections, subjects and rooms for a school
export const getSchoolClasses = async (schoolId) => {
    const [hydratedClassSections, subjects, rooms] = await Promise.all([
        hydrateConfiguredClassSections(schoolId),
        TimetableEntry.distinct("subject", { schoolId }),
        TimetableEntry.distinct("roomNumber", { schoolId }),
    ]);
    const classSections = sortClassSections(hydratedClassSections);
    const standards = [...new Set(classSections.map((item) => item.standard))];
    const sections = [...new Set(classSections.map((item) => item.section))];

    return {
        standards,
        sections,
        classSections,
        subjects: subjects.filter(Boolean).sort(),
        rooms: rooms.filter(Boolean).sort()
    };
};

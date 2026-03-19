import School from "./School.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import { TimetableEntry } from "../timetable/Timetable.model.js";
import { isValidFeatureKey, SCHOOL_FEATURES } from "../../constants/featureFlags.js";
import { ConflictError, NotFoundError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";


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

// Gets unique standards, sections, subjects and rooms for a school
export const getSchoolClasses = async (schoolId) => {
    const [standards, sections, subjects, rooms, classPairs] = await Promise.all([
        StudentProfile.distinct("standard", { schoolId }),
        StudentProfile.distinct("section", { schoolId }),
        TimetableEntry.distinct("subject", { schoolId }),
        TimetableEntry.distinct("roomNumber", { schoolId }),
        StudentProfile.find({ schoolId }).select("standard section").lean()
    ]);

    const classKeySet = new Set();
    const classSections = [];
    for (const pair of classPairs) {
        const key = `${pair.standard}-${pair.section}`;
        if (!classKeySet.has(key)) {
            classKeySet.add(key);
            classSections.push({ standard: pair.standard, section: pair.section });
        }
    }

    return {
        standards: standards.sort(),
        sections: sections.sort(),
        classSections,
        subjects: subjects.filter(Boolean).sort(),
        rooms: rooms.filter(Boolean).sort()
    };
};

import School from "../models/School.model.js";
import { isValidFeatureKey, SCHOOL_FEATURES } from "../constants/featureFlags.js";
import CustomError from "../utils/CustomError.js";
import logger from "../config/logger.js";
import { deleteFile } from "../middlewares/upload.middleware.js";


// Creates a school. 
export const createSchool = async (creatorId, schoolData) => {
    const exists = await School.exists({ code: schoolData.code.toUpperCase() });
    if (exists) throw new CustomError("School code already exists", 409);

    const newSchool = await School.create({
        ...schoolData,
        code: schoolData.code.toUpperCase(),
        createdBy: creatorId
    });

    logger.info(`School Created: ${newSchool.name}`);
    return newSchool;
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
    if (!updated) throw new CustomError("School not found", 404);
    
    return updated;
};

// Gets the "Profile" of the school. 
export const getSchoolProfile = async (schoolId) => {
    // Safety: ensure we actually have an ID to look for
    if (!schoolId) throw new CustomError("School context required", 400);

    const school = await School.findById(schoolId).lean();
    if (!school) throw new CustomError("School not found", 404);
    
    return school;
};

// BRANDING (Logo)
export const getSchoolBranding = async (schoolId) => {
    // If no context , return default
    const defaultBranding = { name: "Protap Club", logoUrl: null, theme: { accentColor: "#2563eb" } };
    if (!schoolId) return defaultBranding;

    const school = await School.findById(schoolId).select('name logoUrl theme').lean();
    return school || defaultBranding;
};

export const updateLogo = async (schoolId, filePath) => {
    const school = await School.findById(schoolId);
    if (!school) throw new CustomError("School not found", 404);

    const oldLogo = school.logoUrl;
    school.logoUrl = filePath;
    await school.save();

    if (oldLogo) await deleteFile(oldLogo);

    return school;
};

// FEATURE MANAGEMENT 
export const getAvailableFeatures = () => Object.values(SCHOOL_FEATURES);

// The Super Admin calls this to turn on/off features for THEIR school.
 export const updateSchoolFeatures = async (schoolId, featureUpdates) => {
    const school = await School.findById(schoolId);
    if (!school) throw new CustomError("School not found", 404);

    // Validate and Apply
    for (const key of Object.keys(featureUpdates)) {
        if (!isValidFeatureKey(key)) throw new CustomError(`Invalid feature key: ${key}`, 400);
        school.features[key] = Boolean(featureUpdates[key]);
    }

    school.markModified('features');
    await school.save();
    return school.features;
};

export const hasFeature = async (schoolId, featureKey) => {
    if (!schoolId) return false;
    const school = await School.findById(schoolId).select(`features.${featureKey}`).lean();
    return school?.features?.[featureKey] === true;
};
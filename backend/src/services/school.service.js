/**
 * School Service - Handles business logic related to school management.
 * This includes CRUD operations for schools, managing branding, features, and user counts.
 */

import School from "../models/School.model.js";
import User from "../models/User.model.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { CustomError } from "../utils/customError.js"; // Import the centralized CustomError
import logger from "../config/logger.js"; // Import the logger

// ═══════════════════════════════════════════════════════════════
// School CRUD Operations
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new school record in the database.
 * @param {string} userId - The ID of the user creating the school.
 * @param {object} schoolData - Data for the new school (name, code, address, contactEmail, contactPhone, logoUrl, theme).
 * @returns {Promise<School>} The newly created school document.
 * @throws {CustomError} If required fields are missing or school code already exists.
 */
export const createSchool = async (userId, { name, code, address, contactEmail, contactPhone, logoUrl, theme }) => {
    logger.info(`Attempting to create a new school by user: ${userId}`);

    // Validate required fields
    if (!name || !code) {
        logger.warn("School creation failed: Name or code is missing.");
        throw new CustomError("Name and code are required", 400);
    }

    // Ensure school code is unique
    const existingSchool = await School.findOne({ code: code.toUpperCase() });
    if (existingSchool) {
        logger.warn(`School creation failed: School code ${code} already exists.`);
        throw new CustomError("School code already exists", 409);
    }

    // Prepare school data, ensuring code is uppercase and creator is set.
    const schoolData = {
        name,
        code: code.toUpperCase(),
        address,
        contactEmail,
        contactPhone,
        logoUrl,
        createdBy: userId
    };

    // Apply custom theme if provided.
    if (theme?.accentColor) {
        schoolData.theme = { accentColor: theme.accentColor };
    }

    const newSchool = await School.create(schoolData);
    logger.info(`New school created successfully: ${newSchool.name} (ID: ${newSchool._id})`);
    return newSchool;
};

/**
 * Retrieves a list of schools based on the user's role and associated school.
 * Super Admins can see all schools, while other roles see only their own school.
 * @param {string} userRole - The role of the current user.
 * @param {string} userSchoolId - The ID of the school associated with the current user.
 * @returns {Promise<School[]>} An array of school documents, populated with user counts.
 */
export const getSchools = async (userRole, userSchoolId) => {
    logger.info(`Fetching schools for role: ${userRole}, schoolId: ${userSchoolId}`);
    let query = {};

    // Super Admins can query all schools.
    if (userRole === USER_ROLES.SUPER_ADMIN) {
        query = {};
    }
    // Other roles can only see their own school.
    else if (userSchoolId) {
        query = { _id: userSchoolId };
    } else {
        logger.warn(`Access denied: Non-super_admin user without schoolId tried to fetch schools.`);
        return []; // No access for this scenario
    }

    // Fetch schools and populate virtual fields for user counts.
    const schools = await School.find(query)
        .populate('adminCount').populate('teacherCount').populate('studentCount')
        .sort({ createdAt: -1 });
    
    logger.info(`Found ${schools.length} schools for role ${userRole}.`);
    return schools;
};

/**
 * Retrieves a single school by its ID, with an access check based on user role.
 * @param {string} id - The ID of the school to retrieve.
 * @param {string} userRole - The role of the current user.
 * @param {string} userSchoolId - The ID of the school associated with the current user.
 * @returns {Promise<School>} The requested school document.
 * @throws {CustomError} If the school is not found or access is denied.
 */
export const getSchoolById = async (id, userRole, userSchoolId) => {
    logger.info(`Fetching school by ID: ${id} for role: ${userRole}, userSchoolId: ${userSchoolId}`);
    
    const school = await School.findById(id)
        .populate('adminCount').populate('teacherCount').populate('studentCount');

    if (!school) {
        logger.warn(`School not found with ID: ${id}`);
        throw new CustomError("School not found", 404);
    }

    // Access control: Super Admin can access any school. Other roles must match their assigned schoolId.
    if (userRole !== USER_ROLES.SUPER_ADMIN && String(userSchoolId) !== String(id)) {
        logger.warn(`Access denied to school ${id} for user with role ${userRole} and schoolId ${userSchoolId}.`);
        throw new CustomError("Access denied", 403);
    }

    logger.info(`Successfully fetched school: ${school.name} (ID: ${school._id})`);
    return school;
};

/**
 * Updates an existing school record.
 * @param {string} id - The ID of the school to update.
 * @param {object} updateData - Fields to update (name, address, contactEmail, contactPhone, logoUrl, isActive, theme).
 * @returns {Promise<School>} The updated school document.
 * @throws {CustomError} If the school is not found.
 */
export const updateSchool = async (id, updateData) => {
    logger.info(`Attempting to update school ID: ${id} with data: %o`, updateData);
    
    const school = await School.findById(id);
    if (!school) {
        logger.warn(`Update school failed: School not found with ID ${id}`);
        throw new CustomError("School not found", 404);
    }

    // Apply updates only for provided fields.
    const { name, address, contactEmail, contactPhone, logoUrl, isActive, theme } = updateData;

    if (name !== undefined) school.name = name;
    if (address !== undefined) school.address = address;
    if (contactEmail !== undefined) school.contactEmail = contactEmail;
    if (contactPhone !== undefined) school.contactPhone = contactPhone;
    if (logoUrl !== undefined) school.logoUrl = logoUrl;
    if (isActive !== undefined) school.isActive = isActive;
    if (theme?.accentColor !== undefined) school.theme.accentColor = theme.accentColor;

    await school.save();
    logger.info(`School ID: ${school._id} updated successfully.`);
    return school;
};

/**
 * Deletes a school record by its ID.
 * Prevents deletion if there are associated users.
 * @param {string} id - The ID of the school to delete.
 * @returns {Promise<void>}
 * @throws {CustomError} If the school is not found or has associated users.
 */
export const deleteSchool = async (id) => {
    logger.info(`Attempting to delete school ID: ${id}`);
    
    const school = await School.findById(id);
    if (!school) {
        logger.warn(`Delete school failed: School not found with ID ${id}`);
        throw new CustomError("School not found", 404);
    }

    // Prevent deletion if there are any users associated with this school.
    const userCount = await User.countDocuments({ schoolId: id });
    if (userCount > 0) {
        logger.warn(`Delete school failed: School ${id} has ${userCount} associated users.`);
        throw new CustomError(`Cannot delete school with ${userCount} associated users. Please reassign or delete users first.`, 400);
    }

    await School.findByIdAndDelete(id);
    logger.info(`School ID: ${id} deleted successfully.`);
};

/**
 * Retrieves a list of active schools, typically for use in dropdowns or selection menus.
 * @returns {Promise<School[]>} An array of active school documents with only name, code, and ID.
 */
export const getSchoolsList = async () => {
    logger.info("Fetching list of active schools.");
    const schools = await School.find({ isActive: true }).select('name code _id').sort({ name: 1 });
    logger.info(`Found ${schools.length} active schools.`);
    return schools;
};

// ═══════════════════════════════════════════════════════════════
// School Branding (Logo & Theme) Operations
// ═══════════════════════════════════════════════════════════════

/**
 * Retrieves branding information (name, logo, theme) for a given school ID.
 * Provides default Protap branding if no schoolId is provided (e.g., for super_admin).
 * @param {string} schoolId - The ID of the school.
 * @returns {Promise<object>} An object containing school name, logo URL, and theme.
 */
export const getSchoolBranding = async (schoolId) => {
    logger.debug(`Fetching branding for schoolId: ${schoolId || 'N/A (Super Admin)'}`);
    
    // Return default branding for super_admin if no specific school is targeted.
    if (!schoolId) {
        return {
            name: "Protap Club",
            logoUrl: "/resource/protap.png",
            theme: { accentColor: "#2563eb" }
        };
    }
    // Fetch specific school branding.
    const schoolBranding = await School.findById(schoolId).select('name logoUrl theme');
    if (!schoolBranding) {
        logger.warn(`School branding not found for ID: ${schoolId}. Returning default.`);
        return {
            name: "Protap Club",
            logoUrl: "/resource/protap.png",
            theme: { accentColor: "#2563eb" }
        };
    }
    logger.info(`Successfully fetched branding for school ID: ${schoolId}`);
    return schoolBranding;
};

/**
 * Handles the upload and update of a school's logo.
 * Stores the file path and returns the old logo URL for potential deletion.
 * @param {string} schoolId - The ID of the school whose logo is being updated.
 * @param {string} filePath - The new file path/URL of the uploaded logo.
 * @param {object} currentUser - The user performing the action, for access control.
 * @returns {Promise<{school: School, oldLogoUrl: string}>} The updated school document and the URL of the old logo.
 * @throws {CustomError} If the school is not found or access is denied.
 */
export const uploadLogo = async (schoolId, filePath, currentUser) => {
    logger.info(`User ${currentUser._id} attempting to upload logo for school ID: ${schoolId}`);
    
    const school = await School.findById(schoolId);
    if (!school) {
        logger.warn(`Upload logo failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }

    // Access check: Only super_admin or an admin of the specific school can upload logos.
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        const userSchoolId = currentUser.schoolId?._id || currentUser.schoolId;
        if (String(userSchoolId) !== String(schoolId)) {
            logger.warn(`Access denied to upload logo for school ${schoolId} by user ${currentUser._id}.`);
            throw new CustomError("Access denied", 403);
        }
    }

    const oldLogoUrl = school.logoUrl; // Store old URL for potential cleanup by controller.
    school.logoUrl = filePath;
    await school.save();
    logger.info(`Logo uploaded and updated for school ID: ${schoolId}. Old logo URL: ${oldLogoUrl || 'none'}`);

    return { school, oldLogoUrl };
};

/**
 * Deletes a school's logo by setting its `logoUrl` to null.
 * Returns the old logo URL for potential file system deletion.
 * @param {string} schoolId - The ID of the school whose logo is being deleted.
 * @param {object} currentUser - The user performing the action, for access control.
 * @returns {Promise<{school: School, oldLogoUrl: string}>} The updated school document and the URL of the deleted logo.
 * @throws {CustomError} If the school is not found or access is denied.
 */
export const deleteLogo = async (schoolId, currentUser) => {
    logger.info(`User ${currentUser._id} attempting to delete logo for school ID: ${schoolId}`);
    
    const school = await School.findById(schoolId);
    if (!school) {
        logger.warn(`Delete logo failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }

    // Access check (same as uploadLogo)
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        const userSchoolId = currentUser.schoolId?._id || currentUser.schoolId;
        if (String(userSchoolId) !== String(schoolId)) {
            logger.warn(`Access denied to delete logo for school ${schoolId} by user ${currentUser._id}.`);
            throw new CustomError("Access denied", 403);
        }
    }

    const oldLogoUrl = school.logoUrl; // Store old URL for potential cleanup.
    school.logoUrl = null;
    await school.save();
    logger.info(`Logo deleted for school ID: ${schoolId}. Old logo URL: ${oldLogoUrl || 'none'}`);

    return { school, oldLogoUrl };
};

/**
 * Updates a school's theme, specifically the accent color.
 * @param {string} schoolId - The ID of the school whose theme is being updated.
 * @param {object} themeData - Object containing the new theme properties (e.g., `{ accentColor: '#RRGGBB' }`).
 * @param {object} currentUser - The user performing the action, for access control.
 * @returns {Promise<object>} An object containing the updated school's branding information.
 * @throws {CustomError} If the school is not found or access is denied.
 */
export const updateTheme = async (schoolId, themeData, currentUser) => {
    logger.info(`User ${currentUser._id} attempting to update theme for school ID: ${schoolId} with data: %o`, themeData);
    
    const school = await School.findById(schoolId);
    if (!school) {
        logger.warn(`Update theme failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }

    // Access check (same as logo operations)
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        const userSchoolId = currentUser.schoolId?._id || currentUser.schoolId;
        if (String(userSchoolId) !== String(schoolId)) {
            logger.warn(`Access denied to update theme for school ${schoolId} by user ${currentUser._id}.`);
            throw new CustomError("Access denied", 403);
        }
    }

    if (themeData.accentColor !== undefined) {
        school.theme.accentColor = themeData.accentColor;
    }

    await school.save();
    logger.info(`Theme updated for school ID: ${school._id}. New accent color: ${school.theme.accentColor}`);
    return { name: school.name, logoUrl: school.logoUrl, theme: school.theme };
};

// ═══════════════════════════════════════════════════════════════
// Feature Management Functions
// ═══════════════════════════════════════════════════════════════

import { isValidFeatureKey, SCHOOL_FEATURES } from "../constants/featureFlags.js";

/**
 * Retrieves all feature flags and their statuses for a specific school.
 * @param {string} schoolId - The ID of the school.
 * @returns {Promise<object>} An object containing the school ID, name, and its features.
 * @throws {CustomError} If the school is not found.
 */
export const getSchoolFeatures = async (schoolId) => {
    logger.debug(`Fetching features for school ID: ${schoolId}`);
    const school = await School.findById(schoolId).select('features name');
    if (!school) {
        logger.warn(`Get school features failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }
    logger.info(`Features fetched for school ${schoolId}.`);
    return { schoolId: school._id, name: school.name, features: school.features };
};

/**
 * Toggles the enabled/disabled status of a single feature for a school.
 * This operation is typically restricted to super_admin users.
 * @param {string} schoolId - The ID of the school to update.
 * @param {string} featureKey - The key of the feature to toggle (e.g., 'attendance').
 * @param {boolean} enabled - The new status for the feature (true for enabled, false for disabled).
 * @param {object} currentUser - The user performing the action, for access control.
 * @returns {Promise<object>} An object containing the school ID, name, and updated features.
 * @throws {CustomError} If user is not super_admin, feature key is invalid, or school not found.
 */
export const toggleSchoolFeature = async (schoolId, featureKey, enabled, currentUser) => {
    logger.info(`User ${currentUser._id} attempting to toggle feature '${featureKey}' to ${enabled} for school ID: ${schoolId}`);
    
    // Restrict this operation to super_admin.
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        logger.warn(`Toggle school feature failed: User ${currentUser._id} is not a super admin.`);
        throw new CustomError("Only super admin can modify school features", 403);
    }

    // Validate the feature key against known feature flags.
    if (!isValidFeatureKey(featureKey)) {
        logger.warn(`Toggle school feature failed: Invalid feature key '${featureKey}' for school ID ${schoolId}.`);
        throw new CustomError(`Invalid feature: ${featureKey}`, 400);
    }

    const school = await School.findById(schoolId);
    if (!school) {
        logger.warn(`Toggle school feature failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }

    school.features[featureKey] = Boolean(enabled);
    await school.save();
    logger.info(`Feature '${featureKey}' for school ${schoolId} set to ${enabled}.`);

    return { schoolId: school._id, name: school.name, features: school.features };
};

/**
 * Updates multiple feature flags for a school simultaneously.
 * This operation is typically restricted to super_admin users.
 * @param {string} schoolId - The ID of the school to update.
 * @param {object} featuresUpdate - An object containing feature keys and their new boolean statuses.
 * @param {object} currentUser - The user performing the action, for access control.
 * @returns {Promise<object>} An object containing the school ID, name, and updated features.
 * @throws {CustomError} If user is not super_admin or school not found.
 */
export const updateSchoolFeatures = async (schoolId, featuresUpdate, currentUser) => {
    logger.info(`User ${currentUser._id} attempting to update features for school ID: ${schoolId} with data: %o`, featuresUpdate);
    
    // Restrict this operation to super_admin.
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        logger.warn(`Update school features failed: User ${currentUser._id} is not a super admin.`);
        throw new CustomError("Only super admin can modify school features", 403);
    }

    const school = await School.findById(schoolId);
    if (!school) {
        logger.warn(`Update school features failed: School not found with ID ${schoolId}`);
        throw new CustomError("School not found", 404);
    }

    // Iterate through the provided updates and apply only to valid feature keys.
    for (const [key, value] of Object.entries(featuresUpdate)) {
        if (isValidFeatureKey(key)) {
            school.features[key] = Boolean(value);
        } else {
            logger.warn(`Skipping update for invalid feature key: ${key} for school ${schoolId}.`);
        }
    }

    await school.save();
    logger.info(`Features updated for school ID: ${school._id}.`);
    return { schoolId: school._id, name: school.name, features: school.features };
};

/**
 * Checks if a specific feature is enabled for a given school.
 * @param {string} schoolId - The ID of the school.
 * @param {string} featureKey - The key of the feature to check.
 * @returns {Promise<boolean>} True if the feature is enabled, false otherwise.
 */
export const hasFeature = async (schoolId, featureKey) => {
    logger.debug(`Checking if school ${schoolId} has feature ${featureKey} enabled.`);
    
    // If no schoolId is provided, no features can be enabled.
    if (!schoolId) {
        return false;
    }

    const school = await School.findById(schoolId).select('features');
    if (!school) {
        logger.debug(`School ${schoolId} not found when checking feature ${featureKey}.`);
        return false;
    }

    return school.features?.[featureKey] === true;
};

/**
 * Retrieves a list of all available school features with their metadata.
 * @returns {object[]} An array of feature objects.
 */
export const getAvailableFeatures = () => {
    logger.debug("Fetching all available school features.");
    return Object.values(SCHOOL_FEATURES);
};

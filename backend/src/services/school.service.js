/**
 * School Service - School management business logic
 */

import School from "../models/School.model.js";
import User from "../models/User.model.js";
import { USER_ROLES } from "../constants/userRoles.js";

/**
 * Custom error with status code
 */
class ServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Create a new school
 */
export const createSchool = async (userId, { name, code, address, contactEmail, contactPhone, logoUrl, theme }) => {
    if (!name || !code) {
        throw new ServiceError("Name and code are required", 400);
    }

    const existingSchool = await School.findOne({ code: code.toUpperCase() });
    if (existingSchool) {
        throw new ServiceError("School code already exists", 409);
    }

    const schoolData = {
        name,
        code: code.toUpperCase(),
        address,
        contactEmail,
        contactPhone,
        logoUrl,
        createdBy: userId
    };

    if (theme?.accentColor) schoolData.theme = { accentColor: theme.accentColor };

    return await School.create(schoolData);
};

/**
 * Get schools based on user role
 */
export const getSchools = async (userRole, userSchoolId) => {
    if (userRole === USER_ROLES.SUPER_ADMIN) {
        return await School.find()
            .populate('adminCount').populate('teacherCount').populate('studentCount')
            .sort({ createdAt: -1 });
    } else if (userSchoolId) {
        return await School.find({ _id: userSchoolId })
            .populate('adminCount').populate('teacherCount').populate('studentCount');
    }
    return [];
};

/**
 * Get school by ID with access check
 */
export const getSchoolById = async (id, userRole, userSchoolId) => {
    const school = await School.findById(id)
        .populate('adminCount').populate('teacherCount').populate('studentCount');

    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    if (userRole !== USER_ROLES.SUPER_ADMIN && userSchoolId?.toString() !== id) {
        throw new ServiceError("Access denied", 403);
    }

    return school;
};

/**
 * Update school
 */
export const updateSchool = async (id, updateData) => {
    const school = await School.findById(id);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    const { name, address, contactEmail, contactPhone, logoUrl, isActive, theme } = updateData;

    if (name) school.name = name;
    if (address !== undefined) school.address = address;
    if (contactEmail !== undefined) school.contactEmail = contactEmail;
    if (contactPhone !== undefined) school.contactPhone = contactPhone;
    if (logoUrl !== undefined) school.logoUrl = logoUrl;
    if (isActive !== undefined) school.isActive = isActive;
    if (theme?.accentColor) school.theme.accentColor = theme.accentColor;

    await school.save();
    return school;
};

/**
 * Delete school
 */
export const deleteSchool = async (id) => {
    const school = await School.findById(id);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    const userCount = await User.countDocuments({ schoolId: id });
    if (userCount > 0) {
        throw new ServiceError(`Cannot delete with ${userCount} users`, 400);
    }

    await School.findByIdAndDelete(id);
};

/**
 * Get list of active schools (for dropdowns)
 */
export const getSchoolsList = async () => {
    return await School.find({ isActive: true }).select('name code _id').sort({ name: 1 });
};

/**
 * Update school logo
 */
export const updateSchoolLogo = async (id, logoUrl) => {
    const school = await School.findById(id);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    school.logoUrl = logoUrl;
    await school.save();
    return school;
};

/**
 * Get school branding for a user
 * Returns default Protap branding for super_admin (no schoolId)
 */
export const getSchoolBranding = async (schoolId) => {
    // Default branding for super_admin (no school assigned)
    if (!schoolId) {
        return {
            name: "Protap Club",
            logoUrl: "/resource/protap.png",
            theme: { accentColor: "#2563eb" }
        };
    }
    return await School.findById(schoolId).select('name logoUrl theme');
};

/**
 * Upload school logo - saves file path and deletes old logo if exists
 */
export const uploadLogo = async (schoolId, filePath, currentUser) => {
    const school = await School.findById(schoolId);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    // Check access - only super_admin or admin of this school
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(currentUser.schoolId) !== String(schoolId)) {
            throw new ServiceError("Access denied", 403);
        }
    }

    // Store old logo path for deletion
    const oldLogoUrl = school.logoUrl;

    // Update with new logo
    school.logoUrl = filePath;
    await school.save();

    return { school, oldLogoUrl };
};

/**
 * Delete school logo
 */
export const deleteLogo = async (schoolId, currentUser) => {
    const school = await School.findById(schoolId);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    // Check access
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(currentUser.schoolId) !== String(schoolId)) {
            throw new ServiceError("Access denied", 403);
        }
    }

    const oldLogoUrl = school.logoUrl;
    school.logoUrl = null;
    await school.save();

    return { school, oldLogoUrl };
};

/**
 * Update school theme
 */
export const updateTheme = async (schoolId, themeData, currentUser) => {
    const school = await School.findById(schoolId);
    if (!school) {
        throw new ServiceError("School not found", 404);
    }

    // Check access - only super_admin or admin of this school
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(currentUser.schoolId) !== String(schoolId)) {
            throw new ServiceError("Access denied", 403);
        }
    }

    if (themeData.accentColor) {
        school.theme.accentColor = themeData.accentColor;
    }

    await school.save();
    return { name: school.name, logoUrl: school.logoUrl, theme: school.theme };
};

export { ServiceError };


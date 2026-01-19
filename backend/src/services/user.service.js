/**
 * User Service - User management business logic
 */

import UserModel from "../models/User.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import { USER_ROLES, canManageRole, getManageableRoles } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";
import { hashPassword } from "../seed/helpers.js";
import { sendCredentialsEmail } from "./email.service.js";
import { generatePassword } from "../utils/password.util.js";

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
 * Create a new user with profile
 */
export const createUser = async (creator, userData) => {
    const { name, email, contactNo, targetRole, schoolId } = userData;

    // Check if creator can manage target role
    if (!canManageRole(creator.role, targetRole)) {
        throw new ServiceError("You are not allowed to create this role", 403);
    }

    if (!name || !email || !targetRole) {
        throw new ServiceError("Name, email, and targetRole are required", 400);
    }

    // Determine school ID based on creator's role
    let userSchoolId;
    if (creator.role === USER_ROLES.SUPER_ADMIN) {
        if (!schoolId) {
            throw new ServiceError("School ID is required", 400);
        }
        userSchoolId = schoolId;
    } else {
        if (!creator.schoolId) {
            throw new ServiceError("You must belong to a school", 400);
        }
        userSchoolId = creator.schoolId;
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        throw new ServiceError("User with this email already exists", 409);
    }

    const config = PROFILE_CONFIG[targetRole];
    if (!config) {
        throw new ServiceError("Invalid target role", 400);
    }

    const missingFields = config.requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
        throw new ServiceError(`Missing: ${missingFields.join(", ")}`, 400);
    }

    const plainPassword = generatePassword(12);
    const hashedPassword = await hashPassword(plainPassword);

    const newUser = await UserModel.create({
        name, email, password: hashedPassword, role: targetRole,
        contactNo, schoolId: userSchoolId, createdBy: creator._id, mustChangePassword: true
    });

    await config.model.create({ userId: newUser._id, ...config.extractFields(userData) });

    const emailResult = await sendCredentialsEmail({ to: email, name, role: targetRole, password: plainPassword });

    return {
        user: { userId: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, schoolId: newUser.schoolId },
        emailSent: emailResult.success
    };
};

/**
 * Get users with pagination
 */
export const getUsers = async (currentUser, filters, pagination) => {
    const { schoolId: filterSchoolId, role: filterRole } = filters;
    const { page = 0, pageSize = 25 } = pagination;

    const allowedRoles = getManageableRoles(currentUser.role);
    if (!allowedRoles?.length) {
        throw new ServiceError("Not allowed to view users", 403);
    }

    // Exclude archived users by default
    let query = { isArchived: { $ne: true } };

    if (filterRole && filterRole !== 'all') {
        if (allowedRoles.includes(filterRole)) {
            query.role = filterRole;
        } else {
            throw new ServiceError("Not allowed to view this role", 403);
        }
    } else {
        query.role = { $in: allowedRoles };
    }

    if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
        if (filterSchoolId) query.schoolId = filterSchoolId;
    } else if (currentUser.schoolId) {
        query.schoolId = currentUser.schoolId;
    }

    // If teacher is viewing students, filter by their assigned standard/section
    if (currentUser.role === USER_ROLES.TEACHER && (filterRole === 'student' || (!filterRole || filterRole === 'all'))) {
        const teacherProfile = await TeacherProfileModel.findOne({ userId: currentUser._id });
        if (teacherProfile?.standard && teacherProfile?.section) {
            // Get student user IDs matching teacher's standard/section
            const matchingStudents = await StudentProfileModel.find({
                standard: teacherProfile.standard,
                section: teacherProfile.section
            }).select('userId');
            const studentUserIds = matchingStudents.map(s => s.userId);

            // If filtering by student role, only show matching students
            if (filterRole === 'student') {
                query._id = { $in: studentUserIds };
            } else {
                // For 'all' roles, add condition that students must match
                query.$or = [
                    { role: { $ne: USER_ROLES.STUDENT } },
                    { _id: { $in: studentUserIds } }
                ];
            }
        }
    }

    const pageNum = parseInt(page) || 0;
    const limit = parseInt(pageSize) || 25;
    const skip = pageNum * limit;

    const totalCount = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
        .select("-password")
        .populate('schoolId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        pagination: { page: pageNum, pageSize: limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    };
};

/**
 * Get users with their profiles
 */
export const getUsersWithProfiles = async (currentUser, roleFilter) => {
    const allowedRoles = getManageableRoles(currentUser.role);
    if (!allowedRoles?.length) {
        throw new ServiceError("Not allowed to view users", 403);
    }

    let targetRoles = allowedRoles;
    if (roleFilter && allowedRoles.includes(roleFilter)) targetRoles = [roleFilter];

    let query = { role: { $in: targetRoles }, isArchived: { $ne: true } };
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN && currentUser.schoolId) {
        query.schoolId = currentUser.schoolId;
    }

    const users = await UserModel.find(query).select("-password").sort({ createdAt: -1 }).lean();

    const usersWithProfiles = await Promise.all(users.map(async (user) => {
        const config = PROFILE_CONFIG[user.role];
        const profile = config ? await config.model.findOne({ userId: user._id }).lean() : null;
        return { ...user, profile };
    }));

    return usersWithProfiles;
};

// ═══════════════════════════════════════════════════════════════
// Archive & Delete Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Check if current user can archive target user
 */
const canArchiveUser = (currentUser, targetUser) => {
    // Only super_admin and admin can archive
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(currentUser.role)) {
        return false;
    }
    // Check role hierarchy
    return canManageRole(currentUser.role, targetUser.role);
};

/**
 * Soft delete (archive) a single user
 */
export const softDeleteUser = async (currentUser, userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ServiceError("User not found", 404);
    }

    if (user.isArchived) {
        throw new ServiceError("User is already archived", 400);
    }

    if (!canArchiveUser(currentUser, user)) {
        throw new ServiceError("Not allowed to archive this user", 403);
    }

    // Non-super_admin can only archive users from their own school
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(user.schoolId) !== String(currentUser.schoolId)) {
            throw new ServiceError("Cannot archive users from other schools", 403);
        }
    }

    user.isArchived = true;
    user.archivedAt = new Date();
    user.archivedBy = currentUser._id;
    user.isActive = false;
    await user.save();

    return { success: true, user: { _id: user._id, name: user.name, email: user.email } };
};

/**
 * Soft delete (archive) multiple users
 */
export const softDeleteUsers = async (currentUser, userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ServiceError("User IDs array is required", 400);
    }

    const results = { archived: [], failed: [] };

    for (const userId of userIds) {
        try {
            const result = await softDeleteUser(currentUser, userId);
            results.archived.push(result.user);
        } catch (error) {
            results.failed.push({ userId, error: error.message });
        }
    }

    return results;
};

/**
 * Hard delete (permanent) a single user - only from archived users
 */
export const hardDeleteUser = async (currentUser, userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ServiceError("User not found", 404);
    }

    if (!user.isArchived) {
        throw new ServiceError("Can only permanently delete archived users. Archive first.", 400);
    }

    // Only super_admin and admin can hard delete
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(currentUser.role)) {
        throw new ServiceError("Not allowed to permanently delete users", 403);
    }

    if (!canManageRole(currentUser.role, user.role)) {
        throw new ServiceError("Not allowed to delete this user role", 403);
    }

    // Non-super_admin can only delete users from their own school
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(user.schoolId) !== String(currentUser.schoolId)) {
            throw new ServiceError("Cannot delete users from other schools", 403);
        }
    }

    // Delete user profile first
    const config = PROFILE_CONFIG[user.role];
    if (config) {
        await config.model.deleteOne({ userId: user._id });
    }

    // Delete user
    await UserModel.findByIdAndDelete(userId);

    return { success: true, user: { _id: user._id, name: user.name, email: user.email } };
};

/**
 * Hard delete (permanent) multiple users
 */
export const hardDeleteUsers = async (currentUser, userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new ServiceError("User IDs array is required", 400);
    }

    const results = { deleted: [], failed: [] };

    for (const userId of userIds) {
        try {
            const result = await hardDeleteUser(currentUser, userId);
            results.deleted.push(result.user);
        } catch (error) {
            results.failed.push({ userId, error: error.message });
        }
    }

    return results;
};

/**
 * Restore an archived user
 */
export const restoreUser = async (currentUser, userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ServiceError("User not found", 404);
    }

    if (!user.isArchived) {
        throw new ServiceError("User is not archived", 400);
    }

    if (!canArchiveUser(currentUser, user)) {
        throw new ServiceError("Not allowed to restore this user", 403);
    }

    // Non-super_admin can only restore users from their own school
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
        if (String(user.schoolId) !== String(currentUser.schoolId)) {
            throw new ServiceError("Cannot restore users from other schools", 403);
        }
    }

    user.isArchived = false;
    user.archivedAt = undefined;
    user.archivedBy = undefined;
    user.isActive = true;
    await user.save();

    return { success: true, user: { _id: user._id, name: user.name, email: user.email } };
};

/**
 * Get archived users with pagination
 */
export const getArchivedUsers = async (currentUser, filters, pagination) => {
    const { schoolId: filterSchoolId, role: filterRole } = filters;
    const { page = 0, pageSize = 25 } = pagination;

    // Only super_admin and admin can view archived users
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(currentUser.role)) {
        throw new ServiceError("Not allowed to view archived users", 403);
    }

    const allowedRoles = getManageableRoles(currentUser.role);

    let query = { isArchived: true };

    if (filterRole && filterRole !== 'all') {
        if (allowedRoles.includes(filterRole)) {
            query.role = filterRole;
        } else {
            throw new ServiceError("Not allowed to view this role", 403);
        }
    } else {
        query.role = { $in: allowedRoles };
    }

    if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
        if (filterSchoolId) query.schoolId = filterSchoolId;
    } else if (currentUser.schoolId) {
        query.schoolId = currentUser.schoolId;
    }

    const pageNum = parseInt(page) || 0;
    const limit = parseInt(pageSize) || 25;
    const skip = pageNum * limit;

    const totalCount = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
        .select("-password")
        .populate('schoolId', 'name code')
        .populate('archivedBy', 'name email')
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        pagination: { page: pageNum, pageSize: limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    };
};

export { ServiceError };

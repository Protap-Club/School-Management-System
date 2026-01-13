/**
 * User Service - User management business logic
 */

import UserModel from "../models/User.model.js";
import { USER_ROLES, canManageRole, getManageableRoles } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";
import { hashPassword } from "../utils/seed.util.js";
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

    let query = {};

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

    let query = { role: { $in: targetRoles } };
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

export { ServiceError };

/**
 * User Service - Handles business logic related to user management.
 * This includes CRUD operations for users, role-based access control,
 * profile management, archiving, deletion, and restoration.
 */

import UserModel from "../models/User.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import { USER_ROLES, canManageRole, getManageableRoles } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";
import { hashPassword, generatePassword } from "../utils/password.util.js";
import { CustomError } from "../utils/customError.js"; // Import the centralized CustomError
import logger from "../config/logger.js"; // Import the logger

// ═══════════════════════════════════════════════════════════════
// User Creation & Retrieval
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new user and their associated profile based on their role.
 * Handles role-based access control for creation and sends out credentials via email.
 * @param {object} creator - The user object of the person creating the new user.
 * @param {object} userData - Data for the new user, including name, email, role, and profile-specific fields.
 * @returns {Promise<{user: object, emailSent: boolean}>} An object containing the new user's details and whether the email was sent.
 * @throws {CustomError} If creator lacks permissions, required fields are missing, email exists, or role is invalid.
 */
export const createUser = async (creator, userData) => {
    logger.info(`User ${creator._id} (${creator.role}) attempting to create new user with email: ${userData.email} and role: ${userData.role}`);
    
    const { name, email, contactNo, role: targetRole, schoolId } = userData;

    // Validate if the creator has permission to create a user with the target role.
    if (!canManageRole(creator.role, targetRole)) {
        logger.warn(`User ${creator._id} tried to create role ${targetRole} but is not allowed.`);
        throw new CustomError("You are not allowed to create this role", 403);
    }

    // Basic validation for essential fields.
    if (!name || !email || !targetRole) {
        logger.warn("User creation failed: Missing name, email, or target role.");
        throw new CustomError("Name, email, and targetRole are required", 400);
    }

    // Determine the school ID for the new user based on the creator's role.
    let userSchoolId;
    if (creator.role === USER_ROLES.SUPER_ADMIN) {
        // Super Admin can specify schoolId, but it's required.
        if (!schoolId) {
            logger.warn("User creation failed by Super Admin: School ID is required for new user.");
            throw new CustomError("School ID is required", 400);
        }
        userSchoolId = schoolId;
    } else {
        // Non-Super Admins create users within their own school.
        if (!creator.schoolId) {
            logger.error(`User ${creator._id} is not a Super Admin and does not belong to a school.`);
            throw new CustomError("You must belong to a school", 400);
        }
        userSchoolId = creator.schoolId;
    }

    // Check for existing user with the same email to prevent duplicates.
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
        logger.warn(`User creation failed: User with email ${email} already exists.`);
        throw new CustomError("User with this email already exists", 409);
    }

    // Retrieve profile configuration for the target role.
    const config = PROFILE_CONFIG[targetRole];
    if (!config) {
        logger.warn(`User creation failed: Invalid target role ${targetRole}.`);
        throw new CustomError("Invalid target role", 400);
    }

    // Validate that all required profile-specific fields are provided.
    const missingFields = config.requiredFields.filter(field => !userData[field]);
    if (missingFields.length > 0) {
        logger.warn(`User creation failed for role ${targetRole}: Missing profile fields: ${missingFields.join(", ")}`);
        throw new CustomError(`Missing required profile fields: ${missingFields.join(", ")}`, 400);
    }

    // Generate a random password and hash it before storing.
    const plainPassword = generatePassword(12);
    const hashedPassword = await hashPassword(plainPassword);

    // Create the new user in the database.
    const newUser = await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role: targetRole,
        contactNo,
        schoolId: userSchoolId,
        createdBy: creator._id,
        mustChangePassword: true, // Force password change on first login.
    });
    logger.info(`User ${newUser._id} created successfully.`);

    // Create the associated profile for the new user.
    await config.model.create({ userId: newUser._id, schoolId: userSchoolId, ...config.extractFields(userData) });
    logger.info(`Profile for user ${newUser._id} (${targetRole}) created.`);

    // Attempt to send credentials email to the new user.
    const emailResult = await sendCredentialsEmail({ to: email, name, role: targetRole, password: plainPassword });
    if (!emailResult.success) {
        logger.warn(`Failed to send credentials email to ${email}. Error: ${emailResult.error}`);
    } else {
        logger.info(`Credentials email successfully sent to ${email}.`);
    }

    return {
        user: { userId: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, schoolId: newUser.schoolId },
        emailSent: emailResult.success
    };
};

/**
 * Retrieves a list of users based on current user's permissions, filters, and pagination.
 * @param {object} currentUser - The user requesting the list.
 * @param {object} filters - Filtering criteria (schoolId, role).
 * @param {object} pagination - Pagination parameters (page, pageSize).
 * @returns {Promise<{users: UserModel[], pagination: object}>} An object containing user list and pagination info.
 * @throws {CustomError} If user is not allowed to view users or specific roles.
 */
export const getUsers = async (currentUser, filters, pagination) => {
    logger.info(`User ${currentUser._id} (${currentUser.role}) fetching users with filters: %o, pagination: %o`, filters, pagination);
    
    const { schoolId: filterSchoolId, role: filterRole } = filters;
    const { page = 0, pageSize = 25 } = pagination;

    // Determine which roles the current user is allowed to manage/view.
    const allowedRoles = getManageableRoles(currentUser.role);
    if (!allowedRoles || allowedRoles.length === 0) {
        logger.warn(`User ${currentUser._id} is not allowed to view any users.`);
        throw new CustomError("Not allowed to view users", 403);
    }

    // Build the query, excluding archived users by default.
    let query = { isArchived: { $ne: true } };

    // Apply role filter if specified and allowed.
    if (filterRole && filterRole !== 'all') {
        if (allowedRoles.includes(filterRole)) {
            query.role = filterRole;
        } else {
            logger.warn(`User ${currentUser._id} is not allowed to view role: ${filterRole}.`);
            throw new CustomError("Not allowed to view this role", 403);
        }
    } else {
        // If no specific role filter, show all manageable roles.
        query.role = { $in: allowedRoles };
    }

    // Apply school ID filter based on current user's role and requested filter.
    if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
        if (filterSchoolId) query.schoolId = filterSchoolId;
    } else if (currentUser.schoolId) {
        query.schoolId = currentUser.schoolId;
    } else {
        logger.warn(`Non-Super Admin user ${currentUser._id} without schoolId trying to fetch users.`);
        // Should not happen if auth middleware is correctly set up.
        throw new CustomError("User does not belong to a school.", 403);
    }

    // Special logic for teachers viewing students within their assigned standard/section.
    if (currentUser.role === USER_ROLES.TEACHER && (filterRole === USER_ROLES.STUDENT || (!filterRole || filterRole === 'all'))) {
        const teacherProfile = await TeacherProfileModel.findOne({ userId: currentUser._id });
        if (teacherProfile?.standard && teacherProfile?.section) {
            // Find student user IDs matching the teacher's standard/section.
            const matchingStudents = await StudentProfileModel.find({
                standard: teacherProfile.standard,
                section: teacherProfile.section
            }).select('userId');
            const studentUserIds = matchingStudents.map(s => s.userId);

            // Adjust query to only show these specific students.
            if (filterRole === USER_ROLES.STUDENT) {
                query._id = { $in: studentUserIds };
            } else {
                // If fetching 'all' roles, combine criteria: non-students OR matching students.
                query.$or = [
                    { role: { $ne: USER_ROLES.STUDENT } },
                    { _id: { $in: studentUserIds } }
                ];
            }
        } else {
            logger.warn(`Teacher ${currentUser._id} does not have standard/section assigned, cannot filter students.`);
            // If teacher profile incomplete, they shouldn't see students.
            query._id = null; // Return no students
        }
    }

    const pageNum = parseInt(page) || 0;
    const limit = parseInt(pageSize) || 25;
    const skip = pageNum * limit;

    const totalCount = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
        .select("-password") // Exclude password from results.
        .populate('schoolId', 'name code') // Populate school details.
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    logger.info(`Found ${users.length} users (total: ${totalCount}) for user ${currentUser._id}.`);
    return {
        users,
        pagination: { page: pageNum, pageSize: limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
    };
};

/**
 * Retrieves users along with their detailed profiles.
 * @param {object} currentUser - The user requesting the list.
 * @param {string} roleFilter - Optional filter to retrieve users of a specific role.
 * @returns {Promise<object[]>} An array of user objects, each including its associated profile.
 * @throws {CustomError} If user is not allowed to view users or specific roles.
 */
export const getUsersWithProfiles = async (currentUser, roleFilter) => {
    logger.info(`User ${currentUser._id} (${currentUser.role}) fetching users with profiles, role filter: ${roleFilter || 'none'}.`);
    
    const allowedRoles = getManageableRoles(currentUser.role);
    if (!allowedRoles || allowedRoles.length === 0) {
        logger.warn(`User ${currentUser._id} is not allowed to view any users with profiles.`);
        throw new CustomError("Not allowed to view users", 403);
    }

    let targetRoles = allowedRoles;
    // Filter by specific role if allowed.
    if (roleFilter && allowedRoles.includes(roleFilter)) {
        targetRoles = [roleFilter];
    } else if (roleFilter && !allowedRoles.includes(roleFilter)) {
        logger.warn(`User ${currentUser._id} is not allowed to view role: ${roleFilter}.`);
        throw new CustomError("Not allowed to view this role", 403);
    }

    let query = { role: { $in: targetRoles }, isArchived: { $ne: true } };
    // Non-Super Admins can only see users from their own school.
    if (currentUser.role !== USER_ROLES.SUPER_ADMIN && currentUser.schoolId) {
        query.schoolId = currentUser.schoolId;
    } else if (currentUser.role !== USER_ROLES.SUPER_ADMIN && !currentUser.schoolId) {
         logger.warn(`Non-Super Admin user ${currentUser._id} without schoolId trying to fetch users with profiles.`);
        throw new CustomError("User does not belong to a school.", 403);
    }


    const users = await UserModel.find(query).select("-password").sort({ createdAt: -1 }).lean();

    // Attach profile data to each user based on their role.
    const usersWithProfiles = await Promise.all(users.map(async (user) => {
        const config = PROFILE_CONFIG[user.role];
        let profile = null;
        if (config) {
            profile = await config.model.findOne({ userId: user._id }).lean();
        }
        return { ...user, profile };
    }));

    logger.info(`Found ${usersWithProfiles.length} users with profiles for user ${currentUser._id}.`);
    return usersWithProfiles;
};

/**
 * Performs a soft delete (archives) for one or more users.
 * This function handles both single and bulk operations efficiently.
 * @param {object} currentUser - The user initiating the archiving action.
 * @param {string|string[]} userIds - A single user ID or an array of user IDs to archive.
 * @returns {Promise<{archived: object[], failed: object[]}>} Object with lists of successfully archived and failed users.
 * @throws {CustomError} If user IDs are not provided or if permissions are violated.
 */
export const softDeleteUsers = async (currentUser, userIds) => {
    const idsToArchive = Array.isArray(userIds) ? userIds : [userIds];
    logger.info(`User ${currentUser._id} attempting to archive users: [${idsToArchive.join(', ')}]`);

    if (idsToArchive.length === 0) {
        throw new CustomError("User ID(s) must be provided.", 400);
    }

    const usersToArchive = await UserModel.find({ _id: { $in: idsToArchive } });

    if (usersToArchive.length !== idsToArchive.length) {
        logger.warn(`Could not find all users for archiving. Requested: ${idsToArchive.length}, Found: ${usersToArchive.length}`);
    }

    const failed = [];
    const currentUserSchoolId = currentUser.schoolId?._id || currentUser.schoolId;

    // Upfront validation for all users.
    for (const user of usersToArchive) {
        if (user.isArchived) {
            failed.push({ userId: user._id, error: "User is already archived" });
        } else if (!canArchiveUser(currentUser, user)) {
            failed.push({ userId: user._id, error: "Not allowed to archive this user" });
        } else if (currentUser.role !== USER_ROLES.SUPER_ADMIN && String(user.schoolId) !== String(currentUserSchoolId)) {
            failed.push({ userId: user._id, error: "Cannot archive users from other schools" });
        }
    }

    if (failed.length > 0) {
        logger.warn(`Archiving validation failed for ${failed.length} users.`);
        // To maintain atomicity, we stop if any validation fails.
        // You could also choose to proceed with the valid ones.
        throw new CustomError("Validation failed for one or more users.", 400, "VALIDATION_FAILED", { failed });
    }

    // If all validations pass, perform a single bulk update.
    const updateResult = await UserModel.updateMany(
        { _id: { $in: idsToArchive } },
        {
            $set: {
                isArchived: true,
                archivedAt: new Date(),
                archivedBy: currentUser._id,
                isActive: false
            }
        }
    );

    logger.info(`Bulk archive successful. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount} users.`);

    // Return the list of users who were archived.
    const archived = usersToArchive.map(u => ({ _id: u._id, name: u.name, email: u.email }));
    return { archived, failed: [] };
};

/**
 * Permanently deletes one or more users from the database.
 * This operation is only allowed for users who are already archived.
 * @param {object} currentUser - The user initiating the permanent deletion.
 * @param {string|string[]} userIds - A single user ID or an array of user IDs to permanently delete.
 * @returns {Promise<{deleted: object[], failed: object[]}>} Object with lists of successfully deleted and failed users.
 * @throws {CustomError} If user IDs are not provided or if permissions are violated.
 */
export const hardDeleteUsers = async (currentUser, userIds) => {
    const idsToDelete = Array.isArray(userIds) ? userIds : [userIds];
    logger.info(`User ${currentUser._id} attempting to hard-delete users: [${idsToDelete.join(', ')}]`);

    if (idsToDelete.length === 0) {
        throw new CustomError("User ID(s) must be provided.", 400);
    }
    
    const usersToDelete = await UserModel.find({ _id: { $in: idsToDelete } });
    const failed = [];
    const currentUserSchoolId = currentUser.schoolId?._id || currentUser.schoolId;

    // Upfront validation
    for (const user of usersToDelete) {
        if (!user.isArchived) {
            failed.push({ userId: user._id, error: "Can only permanently delete archived users. Archive first." });
        } else if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(currentUser.role)) {
            failed.push({ userId: user._id, error: "Not allowed to permanently delete users" });
        } else if (!canManageRole(currentUser.role, user.role)) {
            failed.push({ userId: user._id, error: "Not allowed to delete this user role" });
        } else if (currentUser.role !== USER_ROLES.SUPER_ADMIN && String(user.schoolId) !== String(currentUserSchoolId)) {
            failed.push({ userId: user._id, error: "Cannot delete users from other schools" });
        }
    }
    
    const validUserIds = usersToDelete.filter(u => !failed.some(f => f.userId === u._id)).map(u => u._id);

    if (failed.length > 0) {
        logger.warn(`Hard delete validation failed for ${failed.length} users.`);
        if (validUserIds.length === 0) {
             throw new CustomError("Validation failed for all users.", 400, "VALIDATION_FAILED", { failed });
        }
    }

    // Group users by role to delete their profiles in bulk.
    const profilesToDelete = usersToDelete.reduce((acc, user) => {
        if (validUserIds.includes(user._id)) {
            if (!acc[user.role]) acc[user.role] = [];
            acc[user.role].push(user._id);
        }
        return acc;
    }, {});

    // Delete profiles in bulk for each role.
    for (const role in profilesToDelete) {
        const config = PROFILE_CONFIG[role];
        if (config) {
            const userIdsForRole = profilesToDelete[role];
            await config.model.deleteMany({ userId: { $in: userIdsForRole } });
            logger.debug(`Deleted ${userIdsForRole.length} profiles for role ${role}.`);
        }
    }

    // Finally, bulk delete the users.
    const deleteResult = await UserModel.deleteMany({ _id: { $in: validUserIds } });
    logger.info(`Bulk hard-delete successful. Deleted ${deleteResult.deletedCount} users.`);

    const deleted = usersToDelete.filter(u => validUserIds.includes(u._id)).map(u => ({ _id: u._id, name: u.name, email: u.email }));

    return { deleted, failed };
};

/**
 * Restores one or more archived users, making them active again.
 * @param {object} currentUser - The user initiating the restoration.
 * @param {string|string[]} userIds - A single user ID or an array of user IDs to restore.
 * @returns {Promise<object>} An object indicating the result of the operation.
 * @throws {CustomError} If user not found, not archived, or permission denied.
 */
export const restoreUser = async (currentUser, userIds) => {
    const idsToRestore = Array.isArray(userIds) ? userIds : [userIds];
    logger.info(`User ${currentUser._id} attempting to restore users: [${idsToRestore.join(', ')}]`);

    const usersToRestore = await UserModel.find({ _id: { $in: idsToRestore } });
    const failed = [];
    const currentUserSchoolId = currentUser.schoolId?._id || currentUser.schoolId;

    // Upfront validation
    for (const user of usersToRestore) {
         if (!user.isArchived) {
            failed.push({ userId: user._id, error: "User is not archived" });
        } else if (!canArchiveUser(currentUser, user)) { // `canArchiveUser` logic applies to restoring too
            failed.push({ userId: user._id, error: "Not allowed to restore this user" });
        } else if (currentUser.role !== USER_ROLES.SUPER_ADMIN && String(user.schoolId) !== String(currentUserSchoolId)) {
            failed.push({ userId: user._id, error: "Cannot restore users from other schools" });
        }
    }

    if (failed.length > 0) {
        throw new CustomError("Validation failed for one or more users.", 400, "VALIDATION_FAILED", { failed });
    }

    // Perform bulk update to restore users.
    const updateResult = await UserModel.updateMany(
        { _id: { $in: idsToRestore } },
        { 
            $set: {
                isArchived: false,
                isActive: true
            },
            $unset: {
                archivedAt: "",
                archivedBy: ""
            }
        }
    );

    logger.info(`Bulk restore successful. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount} users.`);
    
    const restored = usersToRestore.map(u => ({ _id: u._id, name: u.name, email: u.email }));
    return { restored, failed: [] };
};

// export { ServiceError };

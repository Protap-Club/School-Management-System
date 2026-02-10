/**
 * Seed Factory - Responsible for creating and managing data for seeding purposes.
 * This module acts as a "factory" to generate schools and users, leveraging
 * the application's core services to ensure data consistency and validation.
 */

import UserModel from "../../module/user/model/User.model.js";
import SchoolModel from "../../module/school/School.model.js";
import AdminProfileModel from "../../module/user/model/AdminProfile.model.js";
import TeacherProfileModel from "../../module/user/model/TeacherProfile.model.js";
import StudentProfileModel from "../../module/user/model/StudentProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { PROFILE_CONFIG } from "../../constants/profileConfig.js";

// Import services for creating users and schools
import { createUser as createUserService } from "../../module/user/user.service.js";
import { createSchool as createSchoolService } from "../../module/school/school.service.js";

// Import logger for consistent output
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DEMO_PASSWORD = "Demo@123";

// A mock "system user" to act as the creator for seeded data.
// This is necessary because service functions expect a `creator` object.
// Using a fixed string ID for consistent system user representation in createdBy fields.
const SYSTEM_USER_ID = "65b774438346e927508a68a1"; // A fixed, non-existent ID
const SYSTEM_USER = {
    _id: SYSTEM_USER_ID,
    role: USER_ROLES.SUPER_ADMIN,
    email: "system@seed.com",
    schoolId: null, // System user doesn't belong to a specific school
};

// ═══════════════════════════════════════════════════════════════
// FINDER UTILITIES (simplified to use direct model queries for cleanup)
// ═══════════════════════════════════════════════════════════════

/**
 * Finds a user by email.
 * @param {string} email - The email of the user to find.
 * @returns {Promise<User|null>} The user document or null if not found.
 */
export const findUserByEmail = async (email) => {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
};

/**
 * Finds a school by its code.
 * @param {string} code - The code of the school to find.
 * @returns {Promise<School|null>} The school document or null if not found.
 */
export const findSchoolByCode = async (code) => {
    return SchoolModel.findOne({ code: code.toUpperCase().trim() });
};

/**
 * Finds the Super Admin user associated with a given school.
 * @param {string} schoolId - The ID of the school.
 * @returns {Promise<User|null>} The Super Admin user document or null if not found.
 */
export const findSuperAdminBySchool = async (schoolId) => {
    return UserModel.findOne({ schoolId, role: USER_ROLES.SUPER_ADMIN, isActive: true });
};

// ═══════════════════════════════════════════════════════════════
// CREATE USER WITH PROFILE (Leveraging userService.createUser)
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a user and their associated profile by calling the application's user service.
 * This ensures that seeding adheres to the same business logic and validations as runtime.
 *
 * @param {object} userData - User data (name, email, role, schoolId, profileData).
 * @param {string} [userData.password=DEMO_PASSWORD] - The user's password.
 * @param {boolean} [userData.mustChangePassword=false] - Whether the user must change password on first login.
 * @returns {Promise<{success: boolean, user?: object, error?: string, existing?: boolean}>} Result of the creation.
 */
export const createUser = async ({
    name, email, role, schoolId, profileData = {},
    password = DEMO_PASSWORD, mustChangePassword = false
}) => {
    // Check if user already exists first to avoid service-level error for duplicates
    const existing = await findUserByEmail(email);
    if (existing) {
        return { success: false, existing: true, error: "User already exists" };
    }

    try {
        const result = await createUserService(SYSTEM_USER, {
            name,
            email,
            role,
            contactNo: profileData.contactPhone || null, // Example: map from profileData if needed
            schoolId,
            password, // Pass plain password, service will hash it
            mustChangePassword,
            skipEmail: true, // Prevent sending real emails during seeding
            ...profileData // Pass other profile-specific data to the service
        });

        return { success: true, user: result.user };
    } catch (error) {
        logger.error(`Failed to create user ${email}: ${error.message}`);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE SCHOOL WITH SUPER ADMIN (Leveraging schoolService.createSchool)
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a school and its associated Super Admin user by calling the application's school and user services.
 * @param {object} schoolDetails - School data (name, code, address, contactPhone).
 * @param {string} [schoolDetails.superAdminName="Vraj"] - Name for the Super Admin.
 * @param {string} [schoolDetails.superAdminEmail=null] - Email for the Super Admin (defaults to vraj@<code>.com).
 * @returns {Promise<{success: boolean, school?: object, superAdmin?: object, error?: string, existing?: boolean}>} Result of the creation.
 */
export const createSchool = async ({ name, code, address, contactPhone, superAdminName = "Vraj", superAdminEmail = null }) => {
    logger.info(`Creating school: ${name} (${code})`);

    // Check if school exists
    const existingSchool = await findSchoolByCode(code);
    if (existingSchool) {
        const existingAdmin = await findSuperAdminBySchool(existingSchool._id);
        if (existingAdmin) {
            logger.info(`School ${code} already exists with Super Admin. Skipping.`);
            return { success: true, existing: true, school: existingSchool, superAdmin: existingAdmin };
        }
    }

    // Prepare school creation data for the service.
    const schoolData = {
        name,
        code,
        address,
        contactPhone,
        contactEmail: superAdminEmail || `vraj@${code.toLowerCase()}.com`
    };

    let school;
    try {
        const result = await createSchoolService(SYSTEM_USER_ID, schoolData);
        school = result.school;
        logger.info(`School '${school.name}' created successfully.`);
    } catch (error) {
        logger.error(`Failed to create school ${name}: ${error.message}`);
        return { success: false, error: error.message };
    }

    // Create SuperAdmin for the new school.
    const superAdminEmailToUse = superAdminEmail || `vraj@${code.toLowerCase()}.com`;
    const superAdminResult = await createUser({
        name: superAdminName,
        email: superAdminEmailToUse,
        role: USER_ROLES.SUPER_ADMIN,
        schoolId: school._id,
        password: DEMO_PASSWORD,
        mustChangePassword: false
    });

    if (!superAdminResult.success && !superAdminResult.existing) {
        logger.error(`Failed to create Super Admin for school ${school.name}: ${superAdminResult.error}`);
        // Optionally, delete the school if Super Admin creation fails, to keep state clean.
        await SchoolModel.findByIdAndDelete(school._id);
        return { success: false, error: `Failed to create Super Admin: ${superAdminResult.error}` };
    }

    // Link createdBy on school to the Super Admin.
    if (superAdminResult.success && superAdminResult.user?._id) {
        await SchoolModel.findByIdAndUpdate(school._id, { createdBy: superAdminResult.user._id });
        logger.info(`School ${school.name} linked to Super Admin ${superAdminResult.user.email}`);
    } else if (superAdminResult.existing) {
        await SchoolModel.findByIdAndUpdate(school._id, { createdBy: superAdminResult.existing._id });
        logger.info(`School ${school.name} linked to existing Super Admin ${superAdminResult.existing.email}`);
    }


    logger.info(`Super Admin: ${superAdminEmailToUse} / ${DEMO_PASSWORD} created/linked for school ${school.name}.`);

    return { success: true, school, superAdmin: superAdminResult.user || superAdminResult.existing };
};

// ═══════════════════════════════════════════════════════════════
// BULK ADD USERS
// ═══════════════════════════════════════════════════════════════

/**
 * Adds multiple users of a specific role to a school.
 * @param {string} schoolCode - The code of the target school.
 * @param {object[]} usersData - An array of user data objects.
 * @param {string} role - The role to assign to these users.
 * @returns {Promise<{success: boolean, created: number, skipped: number, error?: string}>} Summary of the operation.
 */
export const addUsers = async (schoolCode, usersData, role) => {
    logger.info(`Adding ${usersData.length} ${role}s to school with code: ${schoolCode}`);

    const school = await findSchoolByCode(schoolCode);
    if (!school) {
        logger.error(`Failed to add users: School ${schoolCode} not found.`);
        return { success: false, error: "School not found" };
    }

    let created = 0, skipped = 0;

    for (let i = 0; i < usersData.length; i++) {
        const userData = usersData[i];
        const logPrefix = `[${i + 1}/${usersData.length}] ${userData.email}`;

        const result = await createUser({
            name: userData.name,
            email: userData.email,
            role,
            schoolId: school._id,
            profileData: userData,
        });

        if (result.success) {
            logger.info(`${logPrefix} created.`);
            created++;
        } else if (result.existing) {
            logger.warn(`${logPrefix} already exists. Skipped.`);
            skipped++;
        } else {
            logger.error(`${logPrefix} failed: ${result.error}`);
        }
    }

    logger.info(`Finished adding users to ${school.name}. Created: ${created}, Skipped: ${skipped}.`);
    return { success: true, created, skipped };
};

// ═══════════════════════════════════════════════════════════════
// CLEANUP DEMO DATA
// ═══════════════════════════════════════════════════════════════

/**
 * Cleans up demo data by deleting schools and all associated users and profiles.
 * @param {string[]} [schoolCodes=[]] - Optional array of school codes to target for cleanup.
 *                                      If empty, cleans up default demo schools.
 * @returns {Promise<{schools: number, users: number, profiles: number}>} Count of deleted items.
 */
export const cleanup = async (schoolCodes = []) => {
    logger.info("Starting demo data cleanup...");

    // Define default school codes to clean if none are specified.
    const defaultCleanupCodes = ["DPS", "DAV", "TEST"];
    const codesToClean = schoolCodes.length > 0
        ? schoolCodes.map(c => c.toUpperCase())
        : defaultCleanupCodes;

    // Find schools that match the codes to clean.
    const query = { code: { $in: codesToClean } };
    const schools = await SchoolModel.find(query);

    let totalDeleted = { schools: 0, users: 0, profiles: 0 };

    if (schools.length === 0) {
        logger.info("No demo schools found for cleanup.");
        return totalDeleted;
    }

    for (const school of schools) {
        logger.info(`Removing data for school: ${school.name} (${school.code})`);

        // Find all users belonging to this school.
        const users = await UserModel.find({ schoolId: school._id });
        const userIds = users.map(u => u._id);

        if (userIds.length > 0) {
            // Delete profiles associated with these users.
            const adminProfilesResult = await AdminProfileModel.deleteMany({ userId: { $in: userIds } });
            const teacherProfilesResult = await TeacherProfileModel.deleteMany({ userId: { $in: userIds } });
            const studentProfilesResult = await StudentProfileModel.deleteMany({ userId: { $in: userIds } });

            totalDeleted.profiles += adminProfilesResult.deletedCount + teacherProfilesResult.deletedCount + studentProfilesResult.deletedCount;
            logger.info(`Deleted ${totalDeleted.profiles} profiles for school ${school.code}.`);

            // Delete user accounts.
            const usersResult = await UserModel.deleteMany({ schoolId: school._id });
            totalDeleted.users += usersResult.deletedCount;
            logger.info(`Deleted ${totalDeleted.users} users for school ${school.code}.`);
        } else {
            logger.info(`No users found for school ${school.code}.`);
        }

        // Delete the school itself.
        await SchoolModel.findByIdAndDelete(school._id);
        totalDeleted.schools++;
        logger.info(`School ${school.code} deleted.`);
    }

    logger.info(`Cleanup complete. Deleted: ${totalDeleted.schools} schools, ${totalDeleted.users} users, ${totalDeleted.profiles} profiles.`);
    return totalDeleted;
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    DEMO_PASSWORD,
    createUser,
    createSchool,
    addUsers,
    cleanup,
    findSchoolByCode,
    findUserByEmail,
    findSuperAdminBySchool // Keep find functions if commands need them.
};
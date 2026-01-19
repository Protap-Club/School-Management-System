/**
 * Seed Helpers - All seed utilities in one place
 * Handles: DB queries, user creation, school creation, cleanup
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import UserModel from "../models/User.model.js";
import SchoolModel from "../models/School.model.js";
import AdminProfileModel from "../models/AdminProfile.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DEMO_PASSWORD = "Demo@123";

// ═══════════════════════════════════════════════════════════════
// PASSWORD UTILITIES
// ═══════════════════════════════════════════════════════════════

export const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
};

// ═══════════════════════════════════════════════════════════════
// FINDER UTILITIES
// ═══════════════════════════════════════════════════════════════

export const findUserByEmail = async (email) => {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
};

export const findSchoolByCode = async (code) => {
    return SchoolModel.findOne({ code: code.toUpperCase().trim() });
};

export const findSuperAdminBySchool = async (schoolId) => {
    return UserModel.findOne({ schoolId, role: USER_ROLES.SUPER_ADMIN, isActive: true });
};

// ═══════════════════════════════════════════════════════════════
// CREATE USER WITH PROFILE
// ═══════════════════════════════════════════════════════════════

export const createUser = async ({
    name, email, role, schoolId, profileData = {},
    password = DEMO_PASSWORD, createdBy = null, mustChangePassword = false
}) => {
    if (!name || !email || !role || !schoolId) {
        return { success: false, error: "Name, email, role, and schoolId are required" };
    }

    // Check if user exists
    const existing = await findUserByEmail(email);
    if (existing) {
        return { success: false, existing: true, error: "User already exists" };
    }

    const hashedPassword = await hashPassword(password);

    try {
        // Create user
        const user = await UserModel.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            schoolId,
            createdBy,
            mustChangePassword,
            isActive: true,
            isEmailVerified: false
        });

        // Create profile based on role
        let profile = null;
        if (role !== USER_ROLES.SUPER_ADMIN) {
            const config = PROFILE_CONFIG[role];
            if (config) {
                const fields = { ...config.defaultFields, ...config.extractFields(profileData) };
                profile = await config.model.create({ userId: user._id, ...fields });
            }
        }

        return { success: true, user, profile };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// CREATE SCHOOL WITH SUPER ADMIN
// ═══════════════════════════════════════════════════════════════

export const createSchool = async ({ name, code, address, contactPhone, superAdminName = "Vraj", superAdminEmail = null }) => {
    if (!name || !code) {
        return { success: false, error: "School name and code are required" };
    }

    const email = superAdminEmail || `vraj@${code.toLowerCase()}.com`;

    console.log(`\n📋 Creating: ${name} (${code})`);

    // Check if exists
    const existingSchool = await findSchoolByCode(code);
    if (existingSchool) {
        const existingAdmin = await findSuperAdminBySchool(existingSchool._id);
        if (existingAdmin) {
            console.log(`   ⏭️  Already exists`);
            return { success: true, existing: true, school: existingSchool, superAdmin: existingAdmin };
        }
    }

    // Create school
    let school = existingSchool;
    if (!school) {
        school = await SchoolModel.create({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            address,
            contactPhone,
            contactEmail: email,
            isActive: true
        });
        console.log(`   ✅ School created`);
    }

    // Create SuperAdmin
    const result = await createUser({
        name: superAdminName,
        email,
        role: USER_ROLES.SUPER_ADMIN,
        schoolId: school._id,
        password: DEMO_PASSWORD,
        mustChangePassword: false
    });

    if (!result.success && !result.existing) {
        console.log(`   ❌ SuperAdmin failed: ${result.error}`);
        return { success: false, error: result.error };
    }

    // Link creator
    if (result.success) {
        await SchoolModel.findByIdAndUpdate(school._id, { createdBy: result.user._id });
    }

    console.log(`   ✅ SuperAdmin: ${email} / ${DEMO_PASSWORD}`);

    return { success: true, school, superAdmin: result.user || result.existing };
};

// ═══════════════════════════════════════════════════════════════
// BULK ADD USERS
// ═══════════════════════════════════════════════════════════════

export const addUsers = async (schoolCode, users, role) => {
    const school = await findSchoolByCode(schoolCode);
    if (!school) {
        console.log(`❌ School ${schoolCode} not found`);
        return { success: false, error: "School not found" };
    }

    const superAdmin = await findSuperAdminBySchool(school._id);

    console.log(`\n📋 Adding ${users.length} ${role}s to ${school.name}`);

    let created = 0, skipped = 0;

    for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const num = `[${i + 1}/${users.length}]`;

        const result = await createUser({
            name: userData.name,
            email: userData.email,
            role,
            schoolId: school._id,
            profileData: userData,
            createdBy: superAdmin?._id
        });

        if (result.success) {
            console.log(`${num} ✅ ${userData.email}`);
            created++;
        } else if (result.existing) {
            console.log(`${num} ⏭️  ${userData.email} (exists)`);
            skipped++;
        } else {
            console.log(`${num} ❌ ${userData.email} - ${result.error}`);
        }
    }

    console.log(`\n   Created: ${created} | Skipped: ${skipped}`);
    return { success: true, created, skipped };
};

// ═══════════════════════════════════════════════════════════════
// CLEANUP DEMO DATA
// ═══════════════════════════════════════════════════════════════

export const cleanup = async (schoolCodes = []) => {
    console.log("\n🧹 Cleaning up demo data...\n");

    // Find demo schools
    const query = schoolCodes.length > 0
        ? { code: { $in: schoolCodes.map(c => c.toUpperCase()) } }
        : { code: { $in: ["DPS", "DAV", "IITD", "IIMA", "TEST"] } };

    const schools = await SchoolModel.find(query);

    let totalDeleted = { schools: 0, users: 0, profiles: 0 };

    if (schools.length === 0) {
        console.log("   ℹ️  No demo schools found");
        return totalDeleted;
    }

    for (const school of schools) {
        console.log(`   Removing: ${school.name} (${school.code})`);

        const users = await UserModel.find({ schoolId: school._id });
        const userIds = users.map(u => u._id);

        // Delete profiles
        const a = await AdminProfileModel.deleteMany({ userId: { $in: userIds } });
        const t = await TeacherProfileModel.deleteMany({ userId: { $in: userIds } });
        const s = await StudentProfileModel.deleteMany({ userId: { $in: userIds } });
        totalDeleted.profiles += a.deletedCount + t.deletedCount + s.deletedCount;

        // Delete users
        const u = await UserModel.deleteMany({ schoolId: school._id });
        totalDeleted.users += u.deletedCount;

        // Delete school
        await SchoolModel.findByIdAndDelete(school._id);
        totalDeleted.schools++;
    }

    console.log(`\n   ✅ Deleted: ${totalDeleted.schools} schools, ${totalDeleted.users} users, ${totalDeleted.profiles} profiles`);
    return totalDeleted;
};

export default { DEMO_PASSWORD, createUser, createSchool, addUsers, cleanup, findSchoolByCode, findUserByEmail };

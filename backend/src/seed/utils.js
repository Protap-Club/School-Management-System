// Seed Utilities - Reusable functions for database seeding
import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import SchoolModel from "../models/School.model.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";
import { generatePassword } from "../utils/password.util.js";
import { sendCredentialsEmail } from "../services/email.service.js";

// Hash password
export const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
};

// Idempotency helpers
export const findUserByEmail = async (email) => {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
};

export const findSchoolByCode = async (code) => {
    return SchoolModel.findOne({ code: code.toUpperCase().trim() });
};

export const findSuperAdminBySchool = async (schoolId) => {
    return UserModel.findOne({ schoolId, role: USER_ROLES.SUPER_ADMIN, isActive: true });
};

// Create user with profile
export const createUserWithProfile = async ({
    name, email, role, schoolId, createdBy = null, profileData = {},
    contactNo = null, sendEmail = true, password = null, mustChangePassword = true
}) => {
    if (!name || !email || !role) {
        return { success: false, error: "Name, email, and role are required" };
    }

    if (!Object.values(USER_ROLES).includes(role)) {
        return { success: false, error: `Invalid role: ${role}` };
    }

    if (!schoolId) {
        return { success: false, error: "School ID is required" };
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        return { success: false, error: `User ${email} already exists`, existing: true };
    }

    const plainPassword = password || generatePassword(12);
    const hashedPassword = await hashPassword(plainPassword);

    try {
        const newUser = await UserModel.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            schoolId,
            contactNo,
            createdBy,
            mustChangePassword,
            isActive: true,
            isEmailVerified: false
        });

        let profile = null;
        if (role !== USER_ROLES.SUPER_ADMIN) {
            const config = PROFILE_CONFIG[role];
            if (config) {
                const profileFields = { ...config.defaultFields, ...config.extractFields(profileData) };
                profile = await config.model.create({ userId: newUser._id, ...profileFields });
            }
        }

        let emailResult = { success: false };
        if (sendEmail) {
            emailResult = await sendCredentialsEmail({ to: email, name, role, password: plainPassword });
        }

        return {
            success: true,
            user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, schoolId: newUser.schoolId },
            profile,
            plainPassword: sendEmail ? "[sent via email]" : plainPassword,
            emailSent: emailResult.success
        };
    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, error: error.message };
    }
};

// Create school
export const createSchool = async ({
    name, code, address = null, contactEmail = null, contactPhone = null,
    logoUrl = null, createdBy = null
}) => {
    if (!name || !code) {
        return { success: false, error: "Name and code are required" };
    }

    const existingSchool = await findSchoolByCode(code);
    if (existingSchool) {
        return { success: false, error: `School ${code} already exists`, existing: true, school: existingSchool };
    }

    try {
        const school = await SchoolModel.create({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            address, contactEmail, contactPhone, logoUrl, createdBy, isActive: true
        });

        return { success: true, school: { _id: school._id, name: school.name, code: school.code } };
    } catch (error) {
        console.error("Error creating school:", error);
        return { success: false, error: error.message };
    }
};

// Track seeding results
export class SeedResultTracker {
    constructor(operationName) {
        this.operationName = operationName;
        this.created = [];
        this.skipped = [];
        this.failed = [];
        this.startTime = Date.now();
    }

    addCreated(item) { this.created.push(item); }
    addSkipped(item, reason) { this.skipped.push({ item, reason }); }
    addFailed(item, error) { this.failed.push({ item, error }); }

    getSummary() {
        return {
            operation: this.operationName,
            duration: `${Date.now() - this.startTime}ms`,
            totals: { created: this.created.length, skipped: this.skipped.length, failed: this.failed.length },
            created: this.created, skipped: this.skipped, failed: this.failed
        };
    }

    print() {
        const summary = this.getSummary();
        console.log(`\n========== ${summary.operation} ==========`);
        console.log(`Duration: ${summary.duration}`);
        console.log(`Created: ${summary.totals.created} | Skipped: ${summary.totals.skipped} | Failed: ${summary.totals.failed}`);
        if (this.failed.length > 0) {
            console.log("\nFailures:");
            this.failed.forEach(f => console.log(`  - ${JSON.stringify(f.item)}: ${f.error}`));
        }
        console.log("==========================================\n");
    }
}

// Validation
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validateUserSeedData = (userData, expectedRole) => {
    const errors = [];
    if (!userData.name?.trim()) errors.push("Name is required");
    if (!userData.email || !isValidEmail(userData.email)) errors.push("Valid email is required");

    if (expectedRole !== USER_ROLES.SUPER_ADMIN) {
        const config = PROFILE_CONFIG[expectedRole];
        if (config) {
            config.requiredFields.forEach(field => {
                if (!userData[field]) errors.push(`${field} is required for ${expectedRole}`);
            });
        }
    }

    return { valid: errors.length === 0, errors };
};

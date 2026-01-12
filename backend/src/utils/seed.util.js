/**
 * Seed Utilities - Reusable functions for database seeding
 */

import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import InstituteModel from "../models/Institute.model.js";
import AdminProfileModel from "../models/AdminProfile.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { generatePassword } from "./password.util.js";
import { sendCredentialsEmail } from "../services/email.service.js";

// Hash password
export const hashPassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
};

// Profile config for each role
export const PROFILE_CONFIG = {
    admin: {
        model: AdminProfileModel,
        requiredFields: ["department"],
        extractFields: (data) => ({
            department: data.department || "Administration",
            employeeId: data.employeeId,
            permissions: data.permissions || []
        }),
        defaultFields: { department: "Administration" }
    },
    teacher: {
        model: TeacherProfileModel,
        requiredFields: ["department", "designation"],
        extractFields: (data) => ({
            department: data.department,
            designation: data.designation,
            employeeId: data.employeeId,
            qualification: data.qualification,
            joiningDate: data.joiningDate || new Date()
        }),
        defaultFields: { department: "General", designation: "Teacher" }
    },
    student: {
        model: StudentProfileModel,
        requiredFields: ["rollNumber", "course", "year"],
        extractFields: (data) => ({
            rollNumber: data.rollNumber,
            course: data.course,
            year: data.year,
            section: data.section,
            guardianName: data.guardianName,
            guardianContact: data.guardianContact,
            address: data.address,
            admissionDate: data.admissionDate || new Date()
        }),
        defaultFields: {}
    }
};

// Idempotency helpers
export const findUserByEmail = async (email) => {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
};

export const findInstituteByCode = async (code) => {
    return InstituteModel.findOne({ code: code.toUpperCase().trim() });
};

export const findSuperAdminByInstitute = async (instituteId) => {
    return UserModel.findOne({ instituteId, role: USER_ROLES.SUPER_ADMIN, isActive: true });
};

// Create user with profile
export const createUserWithProfile = async ({
    name, email, role, instituteId, createdBy = null, profileData = {},
    contactNo = null, sendEmail = true, password = null, mustChangePassword = true
}) => {
    if (!name || !email || !role) {
        return { success: false, error: "Name, email, and role are required" };
    }

    if (!Object.values(USER_ROLES).includes(role)) {
        return { success: false, error: `Invalid role: ${role}` };
    }

    if (!instituteId) {
        return { success: false, error: "Institute ID is required" };
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
            instituteId,
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
            user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, instituteId: newUser.instituteId },
            profile,
            plainPassword: sendEmail ? "[sent via email]" : plainPassword,
            emailSent: emailResult.success
        };
    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, error: error.message };
    }
};

// Create institute
export const createInstitute = async ({
    name, code, address = null, contactEmail = null, contactPhone = null,
    logoUrl = null, features = { attendance: { enabled: false } }, createdBy = null
}) => {
    if (!name || !code) {
        return { success: false, error: "Name and code are required" };
    }

    const existingInstitute = await findInstituteByCode(code);
    if (existingInstitute) {
        return { success: false, error: `Institute ${code} already exists`, existing: true, institute: existingInstitute };
    }

    try {
        const institute = await InstituteModel.create({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            address, contactEmail, contactPhone, logoUrl, features, createdBy, isActive: true
        });

        return { success: true, institute: { _id: institute._id, name: institute.name, code: institute.code } };
    } catch (error) {
        console.error("Error creating institute:", error);
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

export default {
    hashPassword, findUserByEmail, findInstituteByCode, findSuperAdminByInstitute,
    createUserWithProfile, createInstitute, SeedResultTracker, isValidEmail, validateUserSeedData, PROFILE_CONFIG
};

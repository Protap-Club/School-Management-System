/**
 * Profile Configuration - Shared across controllers and seed utilities
 * Defines required fields and extraction logic for each role's profile
 */

import AdminProfileModel from "../models/AdminProfile.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";

export const PROFILE_CONFIG = Object.freeze({
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
        requiredFields: ["rollNumber", "standard", "year"],
        extractFields: (data) => ({
            rollNumber: data.rollNumber,
            standard: data.standard,
            year: data.year,
            section: data.section,
            guardianName: data.guardianName,
            guardianContact: data.guardianContact,
            address: data.address,
            admissionDate: data.admissionDate || new Date()
        }),
        defaultFields: {}
    }
});

/**
 * Get profile model for a given role
 */
export const getProfileModel = (role) => PROFILE_CONFIG[role]?.model || null;

/**
 * Get required fields for a given role
 */
export const getRequiredFields = (role) => PROFILE_CONFIG[role]?.requiredFields || [];

/**
 * Extract profile fields from request data for a given role
 */
export const extractProfileFields = (role, data) => {
    const config = PROFILE_CONFIG[role];
    if (!config) return null;
    return { ...config.defaultFields, ...config.extractFields(data) };
};

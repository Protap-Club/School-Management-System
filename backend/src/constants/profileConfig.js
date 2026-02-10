import AdminProfileModel from "../module/user/model/AdminProfile.model.js";
import TeacherProfileModel from "../module/user/model/TeacherProfile.model.js";
import StudentProfileModel from "../module/user/model/StudentProfile.model.js";

// Strategy object defining how each role's profile is handled.
// Centralizes model mapping, validation requirements, and data extraction.
export const PROFILE_CONFIG = Object.freeze({
  admin: {
    model: AdminProfileModel,
    requiredFields: ["department"],
    extractFields: (data) => ({
      department: data.department || "Administration",
      employeeId: data.employeeId,
      permissions: data.permissions || [],
    }),
    defaultFields: { department: "Administration" },
  },

  teacher: {
    model: TeacherProfileModel,

    // ensure 'schoolId' is passed here 
    requiredFields: ["standard", "section"],
    extractFields: (data) => ({
      employeeId: data.employeeId,
      standard: data.standard,
      section: data.section,
      qualification: data.qualification,
      joiningDate: data.joiningDate || new Date(),
    }),
    defaultFields: { standard: "9th", section: "A" },
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
      admissionDate: data.admissionDate || new Date(),
    }),
    defaultFields: {},
  },
});

// Helper Functions 
// Get the Mongoose model associated with a specific role
export const getProfileModel = (role) => PROFILE_CONFIG[role]?.model || null;

// Get the list of mandatory fields required for a specific role's profile
export const getRequiredFields = (role) => PROFILE_CONFIG[role]?.requiredFields || [];

// Merges defaults and extracts specific fields from raw request data
export const extractProfileFields = (role, data) => {
  const config = PROFILE_CONFIG[role];
  if (!config) return null;
  return { ...config.defaultFields, ...config.extractFields(data) };
};
import StudentProfile from "../models/StudentProfile.model.js";
import TeacherProfile from "../models/TeacherProfile.model.js";
import AdminProfile from "../models/AdminProfile.model.js";

export const PROFILE_CONFIG = {
    student: {
        model: StudentProfile,
        extractFields: (data) => ({
             rollNumber: data.rollNumber,
             standard: data.standard,
             section: data.section,
             year: data.year || new Date().getFullYear(),
             guardianName: data.guardianName,
             guardianContact: data.guardianContact,
             address: data.address
        })
    },
    teacher: {
        model: TeacherProfile,
        extractFields: (data) => ({
             employeeId: data.employeeId,
             qualification: data.qualification,
             joiningDate: data.joiningDate,
             assignedClasses: data.assignedClasses // Optional
        })
    },
    admin: {
        model: AdminProfile,
        extractFields: (data) => ({
             department: data.department,
             employeeId: data.employeeId,
             permissions: data.permissions
        })
    }
};

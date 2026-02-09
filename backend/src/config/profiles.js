import StudentProfile from "../module/user/model/StudentProfile.model.js";
import TeacherProfile from "../module/user/model/TeacherProfile.model.js";
import AdminProfile from "../module/user/model/AdminProfile.model.js";

export const PROFILE_CONFIG = {
    student: {
        model: StudentProfile,
        extractFields: (data) => ({
            rollNumber: data.rollNumber,
            standard: data.standard,
            section: data.section,
            year: data.year || new Date().getFullYear(),
            fatherName: data.fatherName,
            fatherContact: data.fatherContact,
            motherName: data.motherName,
            motherContact: data.motherContact,
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

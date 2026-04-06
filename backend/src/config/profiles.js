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
            guardianName: data.guardianName,
            guardianContact: data.guardianContact,
            address: data.address
        })
    },
    teacher: {
        model: TeacherProfile,
        extractFields: (data) => {
            const fields = {
                employeeId: data.employeeId,
                qualification: data.qualification,
                joiningDate: data.joiningDate,
                expectedSalary: data.expectedSalary,
                assignedClasses: data.assignedClasses || []
            };

            // If no assignedClasses but standard/section provided, create a single entry
            if (fields.assignedClasses.length === 0 && data.standard && data.section) {
                fields.assignedClasses.push({
                    standard: data.standard,
                    section: data.section,
                    subjects: []
                });
            }
            return fields;
        }
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

/**
 * User Operations - Bulk user creation
 */

import { createUserWithProfile, findSchoolByCode, findSuperAdminBySchool, validateUserSeedData, SeedResultTracker } from "../../utils/seed.util.js";
import { USER_ROLES } from "../../constants/userRoles.js";

/**
 * Add multiple users to a school
 */
export const addUsers = async ({ schoolCode, users, sendEmails = false }) => {
    if (!schoolCode) return { success: false, error: "School code is required" };
    if (!users?.length) return { success: false, error: "Users array is required" };

    const school = await findSchoolByCode(schoolCode);
    if (!school) return { success: false, error: `School ${schoolCode} not found` };

    const superAdmin = await findSuperAdminBySchool(school._id);
    const creatorId = superAdmin?._id || null;

    console.log(`\n📋 Adding ${users.length} users to ${school.name}`);

    const tracker = new SeedResultTracker("Users");

    for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const num = `[${i + 1}/${users.length}]`;

        // Validate
        const validation = validateUserSeedData(userData, userData.role);
        if (!validation.valid) {
            tracker.addFailed({ email: userData.email }, validation.errors.join(", "));
            continue;
        }

        // Can't bulk-create SuperAdmin
        if (userData.role === USER_ROLES.SUPER_ADMIN) {
            tracker.addSkipped({ email: userData.email }, "Use 'school' command for SuperAdmin");
            continue;
        }

        const result = await createUserWithProfile({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            schoolId: school._id,
            contactNo: userData.contactNo,
            createdBy: creatorId,
            profileData: userData.profile || userData,
            sendEmail: sendEmails,
            mustChangePassword: true
        });

        if (result.success) {
            tracker.addCreated({ email: result.user.email, role: result.user.role });
            console.log(`${num} ✅ ${result.user.email}`);
        } else if (result.existing) {
            tracker.addSkipped({ email: userData.email }, "Already exists");
            console.log(`${num} ⏭️  ${userData.email} (exists)`);
        } else {
            tracker.addFailed({ email: userData.email }, result.error);
            console.log(`${num} ❌ ${userData.email}`);
        }
    }

    const summary = tracker.getSummary();
    console.log(`\n   Created: ${summary.totals.created} | Skipped: ${summary.totals.skipped} | Failed: ${summary.totals.failed}`);

    return { success: true, school: { code: school.code, name: school.name }, summary };
};

/**
 * Add admins to a school
 */
export const addAdmins = async (schoolCode, admins, options = {}) => {
    const users = admins.map(a => ({
        ...a,
        role: USER_ROLES.ADMIN,
        profile: { department: a.department || "Administration", employeeId: a.employeeId }
    }));
    return addUsers({ schoolCode, users, ...options });
};

/**
 * Add teachers to a school
 */
export const addTeachers = async (schoolCode, teachers, options = {}) => {
    const users = teachers.map(t => ({
        ...t,
        role: USER_ROLES.TEACHER,
        profile: { department: t.department, designation: t.designation, employeeId: t.employeeId }
    }));
    return addUsers({ schoolCode, users, ...options });
};

/**
 * Add students to a school
 */
export const addStudents = async (schoolCode, students, options = {}) => {
    const users = students.map(s => ({
        ...s,
        role: USER_ROLES.STUDENT,
        profile: { rollNumber: s.rollNumber, standard: s.standard, year: s.year, section: s.section }
    }));
    return addUsers({ schoolCode, users, ...options });
};

export default { addUsers, addAdmins, addTeachers, addStudents };

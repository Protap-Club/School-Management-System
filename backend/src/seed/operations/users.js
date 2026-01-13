/**
 * User Operations - Bulk user creation
 */

import { createUserWithProfile, findInstituteByCode, findSuperAdminByInstitute, validateUserSeedData, SeedResultTracker } from "../../utils/seed.util.js";
import { USER_ROLES } from "../../constants/userRoles.js";

/**
 * Add multiple users to an institute
 */
export const addUsers = async ({ instituteCode, users, sendEmails = false }) => {
    if (!instituteCode) return { success: false, error: "Institute code is required" };
    if (!users?.length) return { success: false, error: "Users array is required" };

    const institute = await findInstituteByCode(instituteCode);
    if (!institute) return { success: false, error: `Institute ${instituteCode} not found` };

    const superAdmin = await findSuperAdminByInstitute(institute._id);
    const creatorId = superAdmin?._id || null;

    console.log(`\n📋 Adding ${users.length} users to ${institute.name}`);

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
            instituteId: institute._id,
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

    return { success: true, institute: { code: institute.code, name: institute.name }, summary };
};

/**
 * Add admins to an institute
 */
export const addAdmins = async (instituteCode, admins, options = {}) => {
    const users = admins.map(a => ({
        ...a,
        role: USER_ROLES.ADMIN,
        profile: { department: a.department || "Administration", employeeId: a.employeeId }
    }));
    return addUsers({ instituteCode, users, ...options });
};

/**
 * Add teachers to an institute
 */
export const addTeachers = async (instituteCode, teachers, options = {}) => {
    const users = teachers.map(t => ({
        ...t,
        role: USER_ROLES.TEACHER,
        profile: { department: t.department, designation: t.designation, employeeId: t.employeeId }
    }));
    return addUsers({ instituteCode, users, ...options });
};

/**
 * Add students to an institute
 */
export const addStudents = async (instituteCode, students, options = {}) => {
    const users = students.map(s => ({
        ...s,
        role: USER_ROLES.STUDENT,
        profile: { rollNumber: s.rollNumber, course: s.course, year: s.year, section: s.section }
    }));
    return addUsers({ instituteCode, users, ...options });
};

export default { addUsers, addAdmins, addTeachers, addStudents };

// Bulk User Seeding - Create multiple users for an institute

import { conf } from "../config/index.js";
import { runSeed, SeedContext } from "../utils/seedRunner.util.js";
import {
    createUserWithProfile,
    findInstituteByCode,
    findSuperAdminByInstitute,
    SeedResultTracker,
    validateUserSeedData
} from "../utils/seed.util.js";
import { USER_ROLES } from "../constants/userRoles.js";

export const seedBulkUsers = async ({ instituteCode, users, sendEmails = true, createdBy = null }) => {
    const ctx = new SeedContext("Bulk User Seeding");
    const tracker = new SeedResultTracker("Bulk Users");

    if (!instituteCode) return { success: false, error: "Institute code is required" };
    if (!users?.length) return { success: false, error: "Users array is required" };

    ctx.log(`Looking up institute: ${instituteCode}`);
    const institute = await findInstituteByCode(instituteCode);
    if (!institute) return { success: false, error: `Institute ${instituteCode} not found` };
    ctx.log(`✅ Found: ${institute.name}`);

    let creatorId = createdBy;
    if (!creatorId) {
        const superAdmin = await findSuperAdminByInstitute(institute._id);
        if (superAdmin) creatorId = superAdmin._id;
    }

    ctx.log(`\nProcessing ${users.length} users...`);

    for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const userNum = `[${i + 1}/${users.length}]`;

        const validation = validateUserSeedData(userData, userData.role);
        if (!validation.valid) {
            tracker.addFailed({ email: userData.email, role: userData.role }, validation.errors.join(", "));
            ctx.log(`${userNum} ❌ ${userData.email}: Validation failed`);
            continue;
        }

        if (userData.role === USER_ROLES.SUPER_ADMIN) {
            tracker.addFailed({ email: userData.email }, "Use schoolProvisioning for SuperAdmin");
            ctx.log(`${userNum} ❌ ${userData.email}: Cannot bulk-create SuperAdmin`);
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
            tracker.addCreated({ email: result.user.email, role: result.user.role, emailSent: result.emailSent });
            ctx.log(`${userNum} ✅ ${result.user.email} (${result.user.role})`);
        } else if (result.existing) {
            tracker.addSkipped({ email: userData.email }, "Already exists");
            ctx.log(`${userNum} ⏭️ ${userData.email}: Already exists`);
        } else {
            tracker.addFailed({ email: userData.email }, result.error);
            ctx.log(`${userNum} ❌ ${userData.email}: ${result.error}`);
        }
    }

    tracker.print();

    return {
        success: true,
        institute: { _id: institute._id, name: institute.name, code: institute.code },
        summary: tracker.getSummary()
    };
};

// Role-specific helpers
export const seedAdmins = async (instituteCode, admins, options = {}) => {
    const users = admins.map(a => ({
        ...a,
        role: USER_ROLES.ADMIN,
        profile: { department: a.department || "Administration", employeeId: a.employeeId, permissions: a.permissions || [] }
    }));
    return seedBulkUsers({ instituteCode, users, ...options });
};

export const seedTeachers = async (instituteCode, teachers, options = {}) => {
    const users = teachers.map(t => ({
        ...t,
        role: USER_ROLES.TEACHER,
        profile: { department: t.department, designation: t.designation, employeeId: t.employeeId, qualification: t.qualification }
    }));
    return seedBulkUsers({ instituteCode, users, ...options });
};

export const seedStudents = async (instituteCode, students, options = {}) => {
    const users = students.map(s => ({
        ...s,
        role: USER_ROLES.STUDENT,
        profile: { rollNumber: s.rollNumber, course: s.course, year: s.year, section: s.section }
    }));
    return seedBulkUsers({ instituteCode, users, ...options });
};

// Sample data
const SAMPLE_SEED_DATA = {
    instituteCode: "DEMO001",
    users: [
        { name: "Admin One", email: "admin1@demo.school", role: "admin", department: "Administration" },
        { name: "Math Teacher", email: "math@demo.school", role: "teacher", department: "Mathematics", designation: "Senior Teacher" },
        { name: "Student One", email: "student1@demo.school", role: "student", rollNumber: "STU001", course: "Grade 10", year: 2026 }
    ]
};

const main = async () => {
    console.log(`\n📋 Institute: ${SAMPLE_SEED_DATA.instituteCode}`);
    console.log(`   Users: ${SAMPLE_SEED_DATA.users.length}\n`);

    const result = await seedBulkUsers({
        instituteCode: SAMPLE_SEED_DATA.instituteCode,
        users: SAMPLE_SEED_DATA.users,
        sendEmails: false
    });

    if (result.success) {
        console.log("\n✅ COMPLETE");
        console.log(`Created: ${result.summary.totals.created} | Skipped: ${result.summary.totals.skipped} | Failed: ${result.summary.totals.failed}`);
    } else {
        console.log(`\n❌ Failed: ${result.error}`);
    }

    return result;
};

if (process.argv[1].includes("bulkUsers.seed.js")) {
    runSeed("Bulk Users", main);
}

export default seedBulkUsers;

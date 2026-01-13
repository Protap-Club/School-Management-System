/**
 * School Operations - Create school with SuperAdmin
 */

import { conf } from "../../config/index.js";
import { createUserWithProfile, createSchool as createSchoolInDB, findSchoolByCode, findSuperAdminBySchool } from "../../utils/seed.util.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import SchoolModel from "../../models/School.model.js";

/**
 * Generate SuperAdmin email from school code
 */
const generateSuperAdminEmail = (schoolCode) => {
    const cleanCode = schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `vraj.${cleanCode}@protap.com`;
};

/**
 * Create a new school with its SuperAdmin
 */
export const createSchool = async ({ name, code, address, contactPhone, superAdmin = {}, sendEmail = false }) => {
    if (!name || !code) {
        return { success: false, error: "School name and code are required" };
    }

    const superAdminEmail = superAdmin.email || generateSuperAdminEmail(code);
    const superAdminName = superAdmin.name || "Vraj";
    const superAdminPassword = conf.SUPER_ADMIN_PASSWORD || "Admin@123";

    console.log(`\n📋 Creating: ${name} (${code})`);
    console.log(`   SuperAdmin: ${superAdminEmail}`);

    // Check if school already exists
    const existingSchool = await findSchoolByCode(code);
    if (existingSchool) {
        const existingSuperAdmin = await findSuperAdminBySchool(existingSchool._id);
        if (existingSuperAdmin) {
            console.log(`   ⏭️  Already exists`);
            return {
                success: true,
                existing: true,
                school: { _id: existingSchool._id, name: existingSchool.name, code: existingSchool.code },
                superAdmin: { _id: existingSuperAdmin._id, email: existingSuperAdmin.email }
            };
        }
    }

    // Create school
    let school;
    if (existingSchool) {
        school = existingSchool;
    } else {
        const result = await createSchoolInDB({
            name,
            code,
            address,
            contactEmail: superAdminEmail,
            contactPhone
        });

        if (!result.success) {
            console.log(`   ❌ Failed: ${result.error}`);
            return result;
        }
        school = result.school;
        console.log(`   ✅ School created`);
    }

    // Create SuperAdmin
    const adminResult = await createUserWithProfile({
        name: superAdminName,
        email: superAdminEmail,
        role: USER_ROLES.SUPER_ADMIN,
        schoolId: school._id,
        password: superAdminPassword,
        sendEmail,
        mustChangePassword: false
    });

    if (!adminResult.success && !adminResult.existing) {
        console.log(`   ❌ SuperAdmin failed: ${adminResult.error}`);
        return { success: false, error: adminResult.error };
    }

    // Link SuperAdmin as creator
    if (adminResult.success && !existingSchool) {
        await SchoolModel.findByIdAndUpdate(school._id, { createdBy: adminResult.user._id });
    }

    console.log(`   ✅ SuperAdmin: ${superAdminEmail} / ${superAdminPassword}`);

    return {
        success: true,
        school: { _id: school._id, name, code },
        superAdmin: { email: superAdminEmail, password: superAdminPassword }
    };
};

export default { createSchool };

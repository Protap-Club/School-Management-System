/**
 * School Provisioning - Create school with SuperAdmin
 * 
 * Email format: vraj.{schoolcode}@protap.com
 * Password: Uses SUPER_ADMIN_PASSWORD from .env (default: Admin@123)
 */

import { conf } from "../config/index.js";
import { runSeed, SeedContext } from "../utils/seedRunner.util.js";
import {
    createUserWithProfile,
    createInstitute,
    findInstituteByCode,
    findSuperAdminByInstitute
} from "../utils/seed.util.js";
import { USER_ROLES } from "../constants/userRoles.js";
import InstituteModel from "../models/Institute.model.js";
import UserModel from "../models/User.model.js";

/**
 * Generate SuperAdmin email from school code
 * Format: vraj.{schoolcode}@protap.com
 */
const generateSuperAdminEmail = (schoolCode) => {
    const cleanCode = schoolCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `vraj.${cleanCode}@protap.com`;
};

export const provisionSchool = async ({ school, superAdmin = {}, sendEmail = true }) => {
    const ctx = new SeedContext("School Provisioning");

    if (!school?.name || !school?.code) {
        return { success: false, error: "School name and code are required" };
    }

    const superAdminEmail = superAdmin.email || generateSuperAdminEmail(school.code);
    const superAdminName = superAdmin.name || "Vraj";
    const superAdminPassword = conf.SUPER_ADMIN_PASSWORD || "Admin@123";

    ctx.log(`Provisioning: ${school.name} (${school.code})`);
    ctx.log(`SuperAdmin: ${superAdminName} <${superAdminEmail}>`);

    const existingSchool = await findInstituteByCode(school.code);
    if (existingSchool) {
        const existingSuperAdmin = await findSuperAdminByInstitute(existingSchool._id);
        if (existingSuperAdmin) {
            return {
                success: false,
                error: "School and SuperAdmin already exist",
                existing: true,
                school: { _id: existingSchool._id, name: existingSchool.name, code: existingSchool.code },
                superAdmin: { _id: existingSuperAdmin._id, name: existingSuperAdmin.name, email: existingSuperAdmin.email }
            };
        }
    }

    let instituteResult;
    if (existingSchool) {
        instituteResult = { success: true, institute: existingSchool };
    } else {
        ctx.log("Creating school...");
        instituteResult = await createInstitute({
            name: school.name,
            code: school.code,
            address: school.address,
            contactEmail: school.contactEmail || superAdminEmail,
            contactPhone: school.contactPhone,
            features: school.features || { attendance: { enabled: false } },
            createdBy: null
        });

        if (!instituteResult.success) {
            return { success: false, error: `Failed to create school: ${instituteResult.error}` };
        }
        ctx.log(`✅ School created: ${instituteResult.institute.name}`);
    }

    const instituteId = instituteResult.institute._id;

    ctx.log("Creating SuperAdmin...");
    const superAdminResult = await createUserWithProfile({
        name: superAdminName,
        email: superAdminEmail,
        role: USER_ROLES.SUPER_ADMIN,
        instituteId: instituteId,
        contactNo: superAdmin.contactNo,
        password: superAdminPassword,
        sendEmail: sendEmail,
        mustChangePassword: false
    });

    if (!superAdminResult.success) {
        if (superAdminResult.existing) {
            ctx.log(`⚠️ SuperAdmin ${superAdminEmail} already exists`);
        } else {
            return { success: false, error: `Failed to create SuperAdmin: ${superAdminResult.error}` };
        }
    } else {
        ctx.log(`✅ SuperAdmin created: ${superAdminResult.user.name}`);
        ctx.log(`   Email: ${superAdminEmail}`);
        ctx.log(`   Password: ${superAdminPassword}`);
        if (!existingSchool) {
            await InstituteModel.findByIdAndUpdate(instituteId, { createdBy: superAdminResult.user._id });
        }
    }

    ctx.log(`\n🎉 Provisioned in ${ctx.getElapsedTime()}ms`);

    return {
        success: true,
        school: { _id: instituteId, name: school.name, code: school.code },
        superAdmin: superAdminResult.success ? {
            _id: superAdminResult.user._id,
            name: superAdminResult.user.name,
            email: superAdminResult.user.email,
            password: superAdminPassword,
            emailSent: superAdminResult.emailSent
        } : null,
        credentialsSent: superAdminResult.emailSent || false
    };
};

// ============================================================
// SCHOOLS TO PROVISION
// ============================================================

const SCHOOLS = [
    {
        school: {
            name: "Indian Institute of Technology Delhi",
            code: "IITD",
            address: "Hauz Khas, New Delhi, Delhi 110016",
            contactPhone: "+91-11-26591999",
            features: { attendance: { enabled: true } }
        }
    },
    {
        school: {
            name: "Indian Institute of Management Ahmedabad",
            code: "IIMA",
            address: "Vastrapur, Ahmedabad, Gujarat 380015",
            contactPhone: "+91-79-66324444",
            features: { attendance: { enabled: true } }
        }
    }
];

const main = async () => {
    console.log("\n" + "=".repeat(60));
    console.log("🏫 SCHOOL PROVISIONING");
    console.log("=".repeat(60));
    console.log(`Password for all SuperAdmins: ${conf.SUPER_ADMIN_PASSWORD || "Admin@123"}\n`);

    const results = [];

    for (const schoolData of SCHOOLS) {
        const email = generateSuperAdminEmail(schoolData.school.code);
        console.log(`\n📋 ${schoolData.school.name} (${schoolData.school.code})`);
        console.log(`   SuperAdmin: vraj.${schoolData.school.code.toLowerCase()}@protap.com`);

        const result = await provisionSchool({
            school: schoolData.school,
            sendEmail: false
        });

        if (result.success) {
            console.log(`   ✅ Created successfully`);
        } else if (result.existing) {
            console.log(`   ⏭️  Already exists`);
        } else {
            console.log(`   ❌ Failed: ${result.error}`);
        }

        results.push(result);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    
    const created = results.filter(r => r.success && !r.existing).length;
    const existing = results.filter(r => r.existing).length;
    const failed = results.filter(r => !r.success && !r.existing).length;
    
    console.log(`Created: ${created} | Already Existed: ${existing} | Failed: ${failed}`);
    console.log("\n🔐 LOGIN CREDENTIALS:");
    SCHOOLS.forEach(s => {
        console.log(`   ${s.school.code}: vraj.${s.school.code.toLowerCase()}@protap.com / ${conf.SUPER_ADMIN_PASSWORD || "Admin@123"}`);
    });
    console.log("=".repeat(60) + "\n");

    return results;
};

if (process.argv[1].includes("schoolProvisioning.seed.js")) {
    runSeed("School Provisioning", main);
}

export default provisionSchool;

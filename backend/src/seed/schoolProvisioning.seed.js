// School Provisioning - Create school with SuperAdmin

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

export const provisionSchool = async ({ school, superAdmin, sendEmail = true }) => {
    const ctx = new SeedContext("School Provisioning");

    if (!school?.name || !school?.code) {
        return { success: false, error: "School name and code are required" };
    }
    if (!superAdmin?.name || !superAdmin?.email) {
        return { success: false, error: "SuperAdmin name and email are required" };
    }

    ctx.log(`Provisioning: ${school.name} (${school.code})`);
    ctx.log(`SuperAdmin: ${superAdmin.name} <${superAdmin.email}>`);

    // Check existing
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

    // Create school
    let instituteResult;
    if (existingSchool) {
        instituteResult = { success: true, institute: existingSchool };
    } else {
        ctx.log("Creating school...");
        instituteResult = await createInstitute({
            name: school.name,
            code: school.code,
            address: school.address,
            contactEmail: school.contactEmail || superAdmin.email,
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

    // Create SuperAdmin
    ctx.log("Creating SuperAdmin...");
    const superAdminResult = await createUserWithProfile({
        name: superAdmin.name,
        email: superAdmin.email,
        role: USER_ROLES.SUPER_ADMIN,
        instituteId: instituteId,
        contactNo: superAdmin.contactNo,
        sendEmail: sendEmail,
        mustChangePassword: true
    });

    if (!superAdminResult.success) {
        if (superAdminResult.existing) {
            ctx.log(`⚠️ SuperAdmin ${superAdmin.email} already exists`);
        } else {
            return { success: false, error: `Failed to create SuperAdmin: ${superAdminResult.error}` };
        }
    } else {
        ctx.log(`✅ SuperAdmin created: ${superAdminResult.user.name}`);
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
            emailSent: superAdminResult.emailSent
        } : null,
        credentialsSent: superAdminResult.emailSent || false
    };
};

// Default config
const DEFAULT_SEED_DATA = {
    school: {
        name: "Demo School",
        code: "DEMO001",
        address: "Demo Address",
        features: { attendance: { enabled: true } }
    },
    superAdmin: {
        name: "Vraj",
        email: conf.SUPER_ADMIN_EMAIL || "npandyavrajesh31@gmail.com"
    }
};

const main = async () => {
    console.log(`\n📋 School: ${DEFAULT_SEED_DATA.school.name} (${DEFAULT_SEED_DATA.school.code})`);
    console.log(`   SuperAdmin: ${DEFAULT_SEED_DATA.superAdmin.name} <${DEFAULT_SEED_DATA.superAdmin.email}>\n`);

    const result = await provisionSchool({
        school: DEFAULT_SEED_DATA.school,
        superAdmin: DEFAULT_SEED_DATA.superAdmin,
        sendEmail: true
    });

    if (result.success) {
        console.log("\n✅ COMPLETE");
        console.log(`School: ${result.school.name} (${result.school.code})`);
        if (result.superAdmin) {
            console.log(`SuperAdmin: ${result.superAdmin.name} <${result.superAdmin.email}>`);
            console.log(`Credentials: ${result.credentialsSent ? "Sent via email" : "Check logs"}`);
        }
    } else {
        console.log(`\n⚠️ ${result.existing ? "Already exists" : "Failed"}: ${result.error}`);
    }

    return result;
};

if (process.argv[1].includes("schoolProvisioning.seed.js")) {
    runSeed("School Provisioning", main);
}

export default provisionSchool;

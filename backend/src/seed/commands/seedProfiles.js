// Seeds admin, teacher, and student profiles from profiles.json + users.json
import { createRequire } from "module";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import AdminProfile from "../../module/user/model/AdminProfile.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const profilesData = require("../data/profiles.json");
const usersData = require("../data/users.json");

const seedProfiles = async () => {
    logger.info("═══ Seeding Profiles ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    // Clear existing profiles for this school
    await AdminProfile.deleteMany({ schoolId: school._id });
    await TeacherProfile.deleteMany({ schoolId: school._id });
    await StudentProfile.deleteMany({ schoolId: school._id });

    // Admin profiles — match by email to get userId
    for (const ap of profilesData.adminProfiles) {
        const user = await User.findOne({ email: ap.email, schoolId: school._id });
        if (!user) { logger.warn(`Admin user not found: ${ap.email}`); continue; }

        await AdminProfile.create({
            userId: user._id,
            permissions: ap.permissions,
            department: ap.department,
            employeeId: ap.employeeId,
        });
    }
    logger.info(`Admin profiles → ${profilesData.adminProfiles.length}`);

    // Teacher profiles — match by email, includes assignedClasses
    for (const tp of profilesData.teacherProfiles) {
        const user = await User.findOne({ email: tp.email, schoolId: school._id });
        if (!user) { logger.warn(`Teacher user not found: ${tp.email}`); continue; }

        await TeacherProfile.create({
            userId: user._id,
            schoolId: school._id,
            employeeId: tp.employeeId,
            qualification: tp.qualification,
            joiningDate: new Date(tp.joiningDate),
            assignedClasses: tp.assignedClasses,
        });
    }
    logger.info(`Teacher profiles → ${profilesData.teacherProfiles.length}`);

    // Student profiles — generated from name pools (matches seedUsers logic)
    const { studentConfig: cfg, studentNamePools: pools } = usersData;
    const firstNames = [...pools.maleFirstNames, ...pools.femaleFirstNames];
    let count = 0;

    for (let std = cfg.standardRange[0]; std <= cfg.standardRange[1]; std++) {
        for (const sec of cfg.sections) {
            for (let roll = 1; roll <= cfg.studentsPerSection; roll++) {
                count++;
                const fn = firstNames[count % firstNames.length];
                const ln = pools.lastNames[count % pools.lastNames.length];
                const fatherFn = pools.fatherFirstNames[count % pools.fatherFirstNames.length];
                const motherFn = pools.motherFirstNames[count % pools.motherFirstNames.length];
                const email = `${fn.toLowerCase()}${count}@${cfg.emailDomain}`;

                const user = await User.findOne({ email, schoolId: school._id });
                if (!user) continue;

                await StudentProfile.create({
                    userId: user._id,
                    schoolId: school._id,
                    rollNumber: `${cfg.rollNumberPrefix}-${std}${sec}-${String(roll).padStart(2, "0")}`,
                    standard: String(std),
                    section: sec,
                    year: cfg.year,
                    admissionDate: new Date(cfg.admissionDate),
                    fatherName: `${fatherFn} ${ln}`,
                    fatherContact: `+91-98${String(count).padStart(8, "0")}`,
                    motherName: `${motherFn} ${ln}`,
                    motherContact: `+91-97${String(count).padStart(8, "0")}`,
                    address: pools.addresses[count % pools.addresses.length],
                });
            }
        }
        logger.info(`Student profiles class ${std} → done`);
    }

    logger.info(`Total profiles → ${profilesData.adminProfiles.length + profilesData.teacherProfiles.length + count}`);
};

export default seedProfiles;

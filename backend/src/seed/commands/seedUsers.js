// Seeds super admin, admins, teachers, and generates 1080 students
import { createRequire } from "module";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const usersData = require("../data/users.json");
const { defaultPassword } = require("../data/schools.json");

const seedUsers = async () => {
    logger.info("═══ Seeding Users ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    // Clear all users belonging to this school
    await User.deleteMany({ schoolId: school._id });

    // Super Admin
    const sa = await User.create({
        ...usersData.superAdmin,
        password: defaultPassword,
        schoolId: school._id,
        isActive: true,
    });
    logger.info(`Super Admin → ${sa.email}`);

    // Admins
    for (const admin of usersData.admins) {
        await User.create({
            ...admin,
            password: defaultPassword,
            schoolId: school._id,
            isActive: true,
        });
    }
    logger.info(`Admins → ${usersData.admins.length}`);

    // Teachers (role not in JSON — injected here)
    for (const teacher of usersData.teachers) {
        await User.create({
            ...teacher,
            role: "teacher",
            password: defaultPassword,
            schoolId: school._id,
            isActive: true,
        });
    }
    logger.info(`Teachers → ${usersData.teachers.length}`);

    // Generate students from name pools
    const { studentConfig: cfg, studentNamePools: pools } = usersData;
    const firstNames = [...pools.maleFirstNames, ...pools.femaleFirstNames];
    let count = 0;

    for (let std = cfg.standardRange[0]; std <= cfg.standardRange[1]; std++) {
        const batch = [];

        for (const sec of cfg.sections) {
            for (let roll = 1; roll <= cfg.studentsPerSection; roll++) {
                count++;
                const fn = firstNames[count % firstNames.length];
                const ln = pools.lastNames[count % pools.lastNames.length];

                batch.push({
                    name: `${fn} ${ln}`,
                    email: `${fn.toLowerCase()}${count}@${cfg.emailDomain}`,
                    role: "student",
                    password: defaultPassword,
                    schoolId: school._id,
                    contactNo: `+91-70${String(count).padStart(8, "0")}`,
                    isActive: true,
                });
            }
        }

        // User.create triggers pre-save hook for password hashing
        await User.create(batch);
        logger.info(`Class ${std} → ${batch.length} students`);
    }

    logger.info(`Total users → ${1 + usersData.admins.length + usersData.teachers.length + count}`);
};

export default seedUsers;

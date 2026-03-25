import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildStudentRecords } from "../lib/studentRecords.js";
import { buildTeacherSeedData } from "../lib/generatedAcademicSeed.js";

const usersData = loadSeedJson("users.json");
const { defaultPassword, schools: schoolsDef } = loadSeedJson("schools.json");

const seedUsers = async () => {
  logger.info("=== Seeding Users ===");

  const schoolCodes = schoolsDef.map((s) => s.code);

  for (const code of schoolCodes) {
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping users.`);
      continue;
    }

    const schoolUsers = usersData[code];
    if (!schoolUsers) {
      logger.warn(`No user data found for school ${code}. Skipping.`);
      continue;
    }

    await User.deleteMany({ schoolId: school._id });

    // Super Admin
    await User.create({
      ...schoolUsers.superAdmin,
      password: defaultPassword,
      schoolId: school._id,
      isActive: true,
    });

    // Admins
    for (const admin of schoolUsers.admins) {
      await User.create({
        ...admin,
        password: defaultPassword,
        schoolId: school._id,
        isActive: true,
      });
    }

    const generatedTeachers = buildTeacherSeedData(code);

    // Teachers
    for (const teacher of generatedTeachers) {
      await User.create({
        ...teacher,
        role: "teacher",
        password: defaultPassword,
        schoolId: school._id,
        isActive: true,
      });
    }

    // Students
    const { studentConfig: cfg } = usersData;
    const studentRecords = buildStudentRecords(usersData, code);
    let totalStudents = 0;

    for (const standard of cfg.standards) {
      const studentBatch = [];
      const standardStudents = studentRecords.filter((s) => s.standard === standard);
      standardStudents.forEach((student) => {
        totalStudents += 1;
        const contactSuffix = String(1000000 + totalStudents).slice(-7);
        studentBatch.push({
          name: student.fullName,
          email: student.email,
          role: "student",
          password: defaultPassword,
          schoolId: school._id,
          contactNo: `${cfg.basePhonePrefix}${contactSuffix}`,
          isActive: true,
        });
      });
      await User.create(studentBatch);
    }

    logger.info(
      `[${code}] Users seeded -> super admin: 1, admins: ${schoolUsers.admins.length}, teachers: ${generatedTeachers.length}, students: ${totalStudents}`
    );
  }
};

export default seedUsers;

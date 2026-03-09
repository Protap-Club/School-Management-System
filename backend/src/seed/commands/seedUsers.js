import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildStudentRecords } from "../lib/studentRecords.js";

const usersData = loadSeedJson("users.json");
const { defaultPassword } = loadSeedJson("schools.json");

const seedUsers = async () => {
  logger.info("=== Seeding Users ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  await User.deleteMany({ schoolId: school._id });

  await User.create({
    ...usersData.superAdmin,
    password: defaultPassword,
    schoolId: school._id,
    isActive: true,
  });

  for (const admin of usersData.admins) {
    await User.create({
      ...admin,
      password: defaultPassword,
      schoolId: school._id,
      isActive: true,
    });
  }

  for (const teacher of usersData.teachers) {
    await User.create({
      ...teacher,
      role: "teacher",
      password: defaultPassword,
      schoolId: school._id,
      isActive: true,
    });
  }

  const { studentConfig: cfg } = usersData;
  const studentRecords = buildStudentRecords(usersData);
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
    logger.info(`Students seeded for class ${standard}: ${studentBatch.length}`);
  }

  logger.info(`Users seeded -> super admin: 1, admins: ${usersData.admins.length}, teachers: ${usersData.teachers.length}, students: ${totalStudents}`);
};

export default seedUsers;

import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import AdminProfile from "../../module/user/model/AdminProfile.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildStudentRecords } from "../lib/studentRecords.js";
import { buildTeacherSeedData } from "../lib/generatedAcademicSeed.js";

const usersData = loadSeedJson("users.json");
const profilesData = loadSeedJson("profiles.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const admissionDateForIndex = (baseDate, rangeDays, index) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + (index % rangeDays));
  return date;
};

const seedProfiles = async () => {
  logger.info("=== Seeding Profiles ===");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping profiles.`);
      continue;
    }

    const schoolProfiles = profilesData[code];
    if (!schoolProfiles) {
      logger.warn(`No profile data for school ${code}. Skipping.`);
      continue;
    }

    await AdminProfile.deleteMany({ userId: { $in: (await User.find({ schoolId: school._id, role: { $in: ["admin", "super_admin"] } }).select("_id")).map((u) => u._id) } });
    await TeacherProfile.deleteMany({ schoolId: school._id });
    await StudentProfile.deleteMany({ schoolId: school._id });

    // --- Admin Profiles ---
    for (const admin of schoolProfiles.adminProfiles) {
      const user = await User.findOne({ email: admin.email, schoolId: school._id });
      if (!user) {
        logger.warn(`[${code}] Missing admin user: ${admin.email}`);
        continue;
      }
      await AdminProfile.create({
        userId: user._id,
        permissions: admin.permissions || [],
        department: admin.department || "",
        employeeId: admin.employeeId || "",
      });
    }

    const generatedTeachers = buildTeacherSeedData(code);

    // --- Teacher Profiles ---
    for (const teacher of generatedTeachers) {
      const user = await User.findOne({ email: teacher.email, schoolId: school._id });
      if (!user) {
        logger.warn(`[${code}] Missing teacher user: ${teacher.email}`);
        continue;
      }
      await TeacherProfile.create({
        userId: user._id,
        schoolId: school._id,
        employeeId: teacher.employeeId,
        qualification: teacher.qualification,
        joiningDate: new Date(teacher.joiningDate),
        expectedSalary: teacher.expectedSalary || 35000,
        classTeacherOf: teacher.classTeacherOf || null,
        assignedClasses: teacher.assignedClasses || [],
      });
    }

    // --- Student Profiles ---
    const { studentConfig: cfg } = usersData;
    const rollPrefix = cfg.rollNumberPrefixes[code] || code;
    const studentRecords = buildStudentRecords(usersData, code);
    let counter = 0;
    const admissionBase = new Date(cfg.admissionDateStart || cfg.admissionDate);

    for (const standard of cfg.standards) {
      const standardStudents = studentRecords.filter((s) => s.standard === standard);
      for (const student of standardStudents) {
        counter += 1;
        const user = await User.findOne({ email: student.email, schoolId: school._id });
        if (!user) continue;

        const birthYear = new Date().getFullYear() - (parseInt(student.standard) + 5);
        await StudentProfile.create({
          userId: user._id,
          schoolId: school._id,
          rollNumber: `${student.standard}${student.section}${String(student.roll).padStart(2, "0")}`,
          standard: student.standard,
          section: student.section,
          year: cfg.year,
          admissionDate: admissionDateForIndex(admissionBase, cfg.admissionDateRangeDays || 30, counter),
          dateOfBirth: new Date(birthYear, counter % 12, (counter % 27) + 1),
          bloodGroup: ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"][counter % 8],
          fatherName: student.fatherName,
          fatherContact: `+91-98${String(10000000 + counter).slice(-8)}`,
          motherName: student.motherName,
          motherContact: `+91-97${String(10000000 + counter).slice(-8)}`,
          address: student.address,
        });
      }
    }

    logger.info(`[${code}] Profiles seeded (admins: ${schoolProfiles.adminProfiles.length}, teachers: ${generatedTeachers.length}, students: ${counter})`);
  }
};

export default seedProfiles;

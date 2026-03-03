import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import AdminProfile from "../../module/user/model/AdminProfile.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildStudentRecords } from "../lib/studentRecords.js";

const usersData = loadSeedJson("users.json");
const profilesData = loadSeedJson("profiles.json");
const timetableData = loadSeedJson("timetable.json");

const addAssignment = (map, email, standard, section, subject) => {
  if (!email) return;
  if (!map[email]) map[email] = new Map();
  const classKey = `${standard}-${section}`;
  if (!map[email].has(classKey)) {
    map[email].set(classKey, {
      standard,
      section,
      subjects: new Set(),
    });
  }
  if (subject) map[email].get(classKey).subjects.add(subject);
};

const admissionDateForIndex = (baseDate, rangeDays, index) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + (index % rangeDays));
  return date;
};

const seedProfiles = async () => {
  logger.info("=== Seeding Profiles ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  await AdminProfile.deleteMany({});
  await TeacherProfile.deleteMany({ schoolId: school._id });
  await StudentProfile.deleteMany({ schoolId: school._id });

  for (const admin of profilesData.adminProfiles) {
    const user = await User.findOne({ email: admin.email, schoolId: school._id });
    if (!user) {
      logger.warn(`Missing admin user for profile: ${admin.email}`);
      continue;
    }

    await AdminProfile.create({
      userId: user._id,
      permissions: admin.permissions || [],
      department: admin.department || "",
      employeeId: admin.employeeId || "",
    });
  }

  const assignmentMap = {};
  const { standards, sections, classTypeByStandard, weeklyTemplateByClassType, subjectTeacherPools } = timetableData;

  for (const standard of standards) {
    for (const section of sections) {
      const classKey = `${standard}-${section}`;
      const classTeacherEmail = profilesData.classTeacherMap?.[classKey];
      addAssignment(assignmentMap, classTeacherEmail, standard, section, "Class Teacher Hour");

      const classType = classTypeByStandard[standard];
      const weeklyTemplate = weeklyTemplateByClassType[classType];
      Object.values(weeklyTemplate).forEach((subjects) => {
        subjects.forEach((subject) => {
          const teacherPool = subjectTeacherPools[subject] || [];
          if (!teacherPool.length) return;
          const poolIndex = (Number(standard) + (section === "A" ? 0 : 1)) % teacherPool.length;
          addAssignment(assignmentMap, teacherPool[poolIndex], standard, section, subject);
        });
      });
    }
  }

  for (const tp of profilesData.teacherProfiles) {
    const user = await User.findOne({ email: tp.email, schoolId: school._id });
    if (!user) {
      logger.warn(`Missing teacher user for profile: ${tp.email}`);
      continue;
    }

    const classesMap = assignmentMap[tp.email] || new Map();
    const assignedClasses = [...classesMap.values()].map((item) => ({
      standard: item.standard,
      section: item.section,
      subjects: [...item.subjects],
    }));

    await TeacherProfile.create({
      userId: user._id,
      schoolId: school._id,
      employeeId: tp.employeeId,
      qualification: tp.qualification,
      joiningDate: new Date(tp.joiningDate),
      assignedClasses,
    });
  }

  const { studentConfig: cfg } = usersData;
  const studentRecords = buildStudentRecords(usersData);
  let counter = 0;
  const admissionBase = new Date(cfg.admissionDateStart);

  for (const standard of cfg.standards) {
    const standardStudents = studentRecords.filter((s) => s.standard === standard);
    for (const student of standardStudents) {
      counter += 1;
      const user = await User.findOne({ email: student.email, schoolId: school._id });
      if (!user) continue;

      await StudentProfile.create({
        userId: user._id,
        schoolId: school._id,
        rollNumber: `${cfg.rollNumberPrefix}-${student.standard}${student.section}-${String(student.roll).padStart(2, "0")}`,
        standard: student.standard,
        section: student.section,
        year: cfg.year,
        admissionDate: admissionDateForIndex(admissionBase, cfg.admissionDateRangeDays, counter),
        fatherName: student.fatherName,
        fatherContact: `+91-98${String(10000000 + counter).slice(-8)}`,
        motherName: student.motherName,
        motherContact: `+91-97${String(10000000 + counter).slice(-8)}`,
        address: student.address,
      });
    }
    logger.info(`Student profiles seeded for class ${standard}`);
  }

  logger.info("Profiles seeded successfully");
};

export default seedProfiles;

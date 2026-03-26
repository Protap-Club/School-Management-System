import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import { Assignment } from "../../module/assignment/Assignment.model.js";
import { Submission } from "../../module/assignment/Submission.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildTeacherSeedData } from "../lib/generatedAcademicSeed.js";

const assignmentData = loadSeedJson("assignments.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const fillTemplate = (template = "", tokens = {}) =>
  Object.entries(tokens).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
};

const seedAssignments = async () => {
  logger.info("=== Seeding Assignments ===");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping assignments.`);
      continue;
    }

    await Submission.deleteMany({ schoolId: school._id });
    await Assignment.deleteMany({ schoolId: school._id });

    const teachers = buildTeacherSeedData(code);
    const teacherUsers = await User.find({
      schoolId: school._id,
      email: { $in: teachers.map((teacher) => teacher.email) },
    }).select("_id email");

    const teacherIdByEmail = new Map(teacherUsers.map((teacher) => [teacher.email, teacher._id]));
    const records = [];

    teachers.forEach((teacher, classIndex) => {
      const createdBy = teacherIdByEmail.get(teacher.email);
      if (!createdBy) {
        logger.warn(`[${code}] Teacher not found for assignments: ${teacher.email}`);
        return;
      }

      const classLabel = `${teacher.assignedClass.standard}-${teacher.assignedClass.section}`;
      const subjects = teacher.subjects?.length ? teacher.subjects : ["English"];

      assignmentData.templates.forEach((template, templateIndex) => {
        const subject = subjects[(classIndex + templateIndex) % subjects.length];

        records.push({
          schoolId: school._id,
          createdBy,
          title: fillTemplate(template.titleTemplate, { classLabel, subject }),
          description: fillTemplate(template.descriptionTemplate, { classLabel, subject }),
          subject,
          standard: teacher.assignedClass.standard,
          section: teacher.assignedClass.section,
          dueDate: addDays(template.dueInDays + (classIndex % 3)),
          requiresSubmission: Boolean(template.requiresSubmission),
          status: "active",
          attachments: [],
        });
      });
    });

    if (records.length) {
      await Assignment.insertMany(records, { ordered: false });
    }

    logger.info(`[${code}] Assignments seeded: ${records.length}`);
  }
};

export default seedAssignments;

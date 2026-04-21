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

  const { getSchoolClassSections, getSubjectsForStandard } = await import("../lib/generatedAcademicSeed.js");
  const TeacherProfile = (await import("../../module/user/model/TeacherProfile.model.js")).default;

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping assignments.`);
      continue;
    }

    await Submission.deleteMany({ schoolId: school._id });
    await Assignment.deleteMany({ schoolId: school._id });

    // Fetch teacher profiles to know who teaches what
    const teacherProfiles = await TeacherProfile.find({ schoolId: school._id }).lean();
    
    // Map: "standard-section-subject" -> teacherUserId
    const assignmentMap = new Map();
    teacherProfiles.forEach(profile => {
      profile.assignedClasses?.forEach(ac => {
        const classKey = `${ac.standard}-${ac.section}`.toUpperCase();
        ac.subjects?.forEach(sub => {
          assignmentMap.set(`${classKey}-${sub}`, profile.userId);
        });
      });
    });

    const classSections = getSchoolClassSections(code);
    const records = [];

    // Iterate through classes to create exactly 25 assignments
    let assignmentCount = 0;
    for (const cls of classSections) {
      if (assignmentCount >= 25) break;

      const classLabel = `${cls.standard}-${cls.section}`;
      const classKey = classLabel.toUpperCase();
      const subjects = getSubjectsForStandard(cls.standard);

      // Create exactly one or two assignments per class to keep it lean
      const numAssignmentsToCreate = Math.min(2, assignmentData.templates.length);

      for (let i = 0; i < numAssignmentsToCreate; i++) {
        if (assignmentCount >= 25) break;

        const template = assignmentData.templates[i];
        // Pick a subject for the assignment (rotate based on index)
        const subject = subjects[i % subjects.length];
        
        // Find the teacher assigned to this subject for this class
        const createdBy = assignmentMap.get(`${classKey}-${subject}`);

        if (!createdBy) {
          continue; // skip if no teacher is assigned to this subject for this class
        }

        records.push({
          schoolId: school._id,
          createdBy,
          title: fillTemplate(template.titleTemplate, { classLabel, subject }),
          description: fillTemplate(template.descriptionTemplate, { classLabel, subject }),
          subject,
          standard: String(cls.standard),
          section: String(cls.section),
          dueDate: addDays(template.dueInDays + i),
          requiresSubmission: Boolean(template.requiresSubmission),
          status: "active",
          attachments: [],
        });
        
        assignmentCount++;
      }
    }

    if (records.length) {
      await Assignment.insertMany(records, { ordered: false });
    }

    logger.info(`[${code}] Assignments seeded: ${records.length}`);
  }
};

export default seedAssignments;

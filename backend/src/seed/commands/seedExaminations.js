import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import Exam from "../../module/examination/Exam.model.js";
import Result from "../../module/result/result.model.js";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { buildTeacherSeedData, getAcademicYear } from "../lib/generatedAcademicSeed.js";

const examData = loadSeedJson("examinations.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const fillTemplate = (template = "", tokens = {}) =>
  Object.entries(tokens).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );

const addSchoolDays = (daysFromNow) => {
  const date = new Date();
  let remaining = Number(daysFromNow);

  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) {
      remaining -= 1;
    }
  }

  return date;
};

const toDateOnly = (date) => {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
};

const addMinutes = (timeValue, minutesToAdd) => {
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  const totalMinutes = (hours * 60) + minutes + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
};

const buildDateTime = (dateValue, timeValue) => {
  const date = new Date(dateValue);
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const buildSchedule = (teacher, template, classIndex, teacherId) => {
  const subjects = teacher.subjects?.length ? teacher.subjects : ["English"];
  const totalSubjects = Math.min(template.subjectsPerExam || 1, subjects.length);

  return Array.from({ length: totalSubjects }, (_, subjectIndex) => {
    const examDate = addSchoolDays(template.daysFromNow + classIndex + subjectIndex);
    const subject = subjects[(classIndex + subjectIndex) % subjects.length];

    return {
      subject,
      examDate: toDateOnly(examDate),
      startTime: template.startTime,
      endTime: addMinutes(template.startTime, template.durationMinutes || 60),
      totalMarks: template.totalMarks,
      passingMarks: template.passingMarks,
      assignedTeacher: teacherId,
      syllabus: `${subject} revision for Class ${teacher.assignedClass.standard}-${teacher.assignedClass.section}`,
    };
  });
};

const buildCalendarEvents = (exam, schoolId) =>
  (exam.schedule || []).map((item) => ({
    title: item.subject,
    description: `${exam.name} for Class ${exam.standard}-${exam.section}`,
    start: buildDateTime(item.examDate, item.startTime),
    end: buildDateTime(item.examDate, item.endTime || item.startTime),
    allDay: false,
    type: "exam",
    targetAudience: "classes",
    targetClasses: [`${exam.standard}-${exam.section}`],
    createdBy: exam.createdBy,
    schoolId,
    sourceType: "exam",
    sourceId: exam._id,
  }));

const seedExaminations = async () => {
  logger.info("=== Seeding Examinations ===");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping examinations.`);
      continue;
    }

    await Result.deleteMany({ schoolId: school._id });
    await Exam.deleteMany({ schoolId: school._id });
    await CalendarEvent.deleteMany({
      schoolId: school._id,
      sourceType: "exam",
    });

    const teachers = buildTeacherSeedData(code);
    const teacherUsers = await User.find({
      schoolId: school._id,
      email: { $in: teachers.map((teacher) => teacher.email) },
    }).select("_id email");
    const admin = await User.findOne({
      schoolId: school._id,
      role: { $in: ["admin", "super_admin"] },
    }).select("_id role");

    if (!admin) {
      logger.warn(`[${code}] No admin found. Skipping examinations.`);
      continue;
    }

    const teacherIdByEmail = new Map(teacherUsers.map((teacher) => [teacher.email, teacher._id]));
    const examRecords = [];

    teachers.forEach((teacher, classIndex) => {
      const teacherId = teacherIdByEmail.get(teacher.email);
      if (!teacherId) {
        logger.warn(`[${code}] Teacher not found for examinations: ${teacher.email}`);
        return;
      }

      const classLabel = `${teacher.assignedClass.standard}-${teacher.assignedClass.section}`;
      const templates = [examData.classTestTemplate, examData.termExamTemplate];

      templates.forEach((template) => {
        const createdBy = template.examType === "CLASS_TEST" ? teacherId : admin._id;
        const createdByRole = template.examType === "CLASS_TEST" ? "teacher" : admin.role;

        examRecords.push({
          schoolId: school._id,
          name: fillTemplate(template.nameTemplate, { classLabel }),
          examType: template.examType,
          category: template.category,
          academicYear: getAcademicYear(),
          standard: teacher.assignedClass.standard,
          section: teacher.assignedClass.section,
          description: fillTemplate(template.descriptionTemplate, { classLabel }),
          schedule: buildSchedule(teacher, template, classIndex, teacherId),
          status: template.status,
          createdBy,
          createdByRole,
          isActive: true,
        });
      });
    });

    const insertedExams = examRecords.length ? await Exam.insertMany(examRecords, { ordered: false }) : [];
    const calendarEvents = insertedExams
      .filter((exam) => exam.status === "PUBLISHED")
      .flatMap((exam) => buildCalendarEvents(exam, school._id));

    if (calendarEvents.length) {
      await CalendarEvent.insertMany(calendarEvents, { ordered: false });
    }

    logger.info(`[${code}] Examinations seeded: ${insertedExams.length}`);
  }
};

export default seedExaminations;

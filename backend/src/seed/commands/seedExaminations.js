import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import Exam from "../../module/examination/Exam.model.js";
import Result from "../../module/result/result.model.js";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import { getAcademicYear } from "../lib/generatedAcademicSeed.js";

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
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
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

const buildSchedule = (template, classIdx, classRef, subjects, assignmentMap, adminId) => {
  const classKey = `${classRef.standard}-${classRef.section}`.toUpperCase();
  const totalSubjects = Math.min(template.subjectsPerExam || 1, subjects.length);

  return Array.from({ length: totalSubjects }, (_, subjectIndex) => {
    // Generate dates based on class + subject offset
    const examDate = addSchoolDays(template.daysFromNow + classIdx + subjectIndex);
    const subject = subjects[subjectIndex % subjects.length];
    
    // Find the actual teacher handling this subject for this class
    const teacherId = assignmentMap.get(`${classKey}-${subject}`) || adminId;

    return {
      subject,
      examDate: toDateOnly(examDate),
      startTime: template.startTime,
      endTime: addMinutes(template.startTime, template.durationMinutes || 60),
      totalMarks: template.totalMarks,
      passingMarks: template.passingMarks,
      assignedTeacher: teacherId,
      syllabus: `${subject} revision for Class ${classRef.standard}-${classRef.section}`,
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

  const { getSchoolClassSections, getSubjectsForStandard } = await import("../lib/generatedAcademicSeed.js");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });

    if (!school) {
      logger.warn(`School ${code} not found. Skipping examinations.`);
      continue;
    }

    // 🔥 CLEAN OLD DATA
    await Result.deleteMany({ schoolId: school._id });
    await Exam.deleteMany({ schoolId: school._id });
    await CalendarEvent.deleteMany({
      schoolId: school._id,
      sourceType: "exam",
    });

    const teacherProfiles = await TeacherProfile.find({
      schoolId: school._id,
    }).populate("userId").lean();

    const admin = await User.findOne({
      schoolId: school._id,
      role: { $in: ["admin", "super_admin"] },
    }).select("_id role");

    if (!admin) {
      logger.warn(`[${code}] No admin found. Skipping examinations.`);
      continue;
    }
    
    // Map: "standard-section-subject" -> teacherUserId
    const assignmentMap = new Map();
    teacherProfiles.forEach(profile => {
      profile.assignedClasses?.forEach(ac => {
        const classKey = `${ac.standard}-${ac.section}`.toUpperCase();
        ac.subjects?.forEach(sub => {
          assignmentMap.set(`${classKey}-${sub}`, profile.userId?._id);
        });
      });
    });

    const examRecords = [];
    const classSections = getSchoolClassSections(code);

    let examCount = 0;
    classSections.forEach((classRef, classIdx) => {
      if (examCount >= 25) return;

      const classLabel = `${classRef.standard}-${classRef.section}`;
      const classKey = classLabel.toUpperCase();
      const subjects = getSubjectsForStandard(classRef.standard);
      const templates = [examData.classTestTemplate, examData.termExamTemplate];

      templates.forEach((baseTemplate) => {
        if (examCount >= 25) return;

        const defaultSubject = subjects[0];
        const teacherUserId = assignmentMap.get(`${classKey}-${defaultSubject}`);

        if (baseTemplate.examType === "CLASS_TEST" && !teacherUserId) {
          return;
        }

        const createdBy = baseTemplate.examType === "CLASS_TEST" ? teacherUserId : admin._id;
        const createdByRole = baseTemplate.examType === "CLASS_TEST" ? "teacher" : admin.role;

        // Clone template to safely mutate daysFromNow
        const template = { ...baseTemplate };
        
        // Force first 10 to be past (COMPLETED), remaining 15 to be future (PUBLISHED/DRAFT)
        if (examCount < 10) {
          template.daysFromNow = -30 - (examCount * 2); // strictly past
        } else {
          template.daysFromNow = 15 + (examCount * 2);  // strictly future
        }

        const schedule = buildSchedule(template, classIdx, classRef, subjects, assignmentMap, admin._id);
        const isPast = schedule.every((s) => new Date(s.examDate).getTime() < new Date().getTime());
        const status = isPast ? "COMPLETED" : "PUBLISHED";

        examRecords.push({
          schoolId: school._id,
          name: fillTemplate(template.nameTemplate, { classLabel }),
          examType: template.examType,
          category: template.category,
          academicYear: getAcademicYear(),
          standard: classRef.standard,
          section: classRef.section,
          description: fillTemplate(template.descriptionTemplate, { classLabel }),
          schedule,
          status,
          createdBy,
          createdByRole,
          isActive: true,
        });

        examCount++;
      });
    });

    const insertedExams = examRecords.length
      ? await Exam.insertMany(examRecords, { ordered: false })
      : [];

    const calendarEvents = insertedExams
      .filter((exam) => exam.status === "PUBLISHED" || exam.status === "COMPLETED")
      .flatMap((exam) => buildCalendarEvents(exam, school._id));

    if (calendarEvents.length) {
      await CalendarEvent.insertMany(calendarEvents, { ordered: false });
    }

    logger.info(`[${code}] Examinations seeded: ${insertedExams.length}`);
  }
};

export default seedExaminations;
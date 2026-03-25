import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import {
  buildTeacherSeedData,
  createClassKey,
  getAcademicYear,
  getSchoolClassSections,
  getSeedDaysOfWeek,
  getSubjectsForStandard,
} from "../lib/generatedAcademicSeed.js";

const ttData = loadSeedJson("timetable.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const DAY_MAP = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const daysOfWeek = getSeedDaysOfWeek();

const seedTimetable = async () => {
  logger.info("=== Seeding Timetable ===");

  for (const schoolDef of schoolsDef) {
    const code = schoolDef.code;
    const school = await School.findOne({ code });
    if (!school) {
      logger.warn(`School ${code} not found. Skipping timetable.`);
      continue;
    }

    // Clean up
    const existing = await Timetable.find({ schoolId: school._id }).select("_id");
    await TimetableEntry.deleteMany({ timetableId: { $in: existing.map((t) => t._id) } });
    await Timetable.deleteMany({ schoolId: school._id });
    await TimeSlot.deleteMany({ schoolId: school._id });

    // 1. TimeSlots (same for all schools)
    const slots = await TimeSlot.insertMany(
      ttData.timeSlots.map((slot) => ({ ...slot, schoolId: school._id }))
    );
    const slotByNumber = {};
    slots.forEach((slot) => {
      slotByNumber[slot.slotNumber] = slot;
    });

    // 2. Timetable headers
    const classSections = getSchoolClassSections(code);
    const timetableHeaders = classSections.map((tt) => ({
      schoolId: school._id,
      standard: String(tt.standard),
      section: String(tt.section).toUpperCase(),
      academicYear: ttData.academicYear || getAcademicYear(),
    }));
    const createdTimetables = await Timetable.insertMany(timetableHeaders);

    const timetableMap = {};
    createdTimetables.forEach((item) => {
      timetableMap[`${item.standard}-${item.section}`] = item._id;
    });

    // 3. Resolve teacher emails for this school
    const generatedTeachers = buildTeacherSeedData(code);
    const teacherEmails = generatedTeachers.map((teacher) => teacher.email);
    const teachers = await User.find({
      schoolId: school._id,
      email: { $in: teacherEmails },
    }).select("_id email");
    const teacherIdByEmail = {};
    teachers.forEach((t) => {
      teacherIdByEmail[t.email] = t._id;
    });

    // 4. Create entries
    const entries = [];
    const classSlots = Object.values(slotByNumber)
      .filter((slot) => slot.slotType === "CLASS")
      .sort((left, right) => left.slotNumber - right.slotNumber);

    for (const teacher of generatedTeachers) {
      const classKey = createClassKey(teacher.assignedClass);
      const timetableId = timetableMap[classKey];
      if (!timetableId) continue;

      const teacherId = teacherIdByEmail[teacher.email];
      if (!teacherId) {
        logger.warn(`[${code}] Teacher not found: ${teacher.email}`);
        continue;
      }

      const subjects = teacher.subjects?.length
        ? teacher.subjects
        : getSubjectsForStandard(teacher.assignedClass.standard);

      daysOfWeek.forEach((day, dayIndex) => {
        const dayShort = DAY_MAP[day];
        if (!dayShort) return;

        classSlots.forEach((slot, slotIndex) => {
          const subject = subjects[(slotIndex + dayIndex) % subjects.length];

          entries.push({
            schoolId: school._id,
            timetableId,
            dayOfWeek: dayShort,
            timeSlotId: slot._id,
            subject,
            teacherId,
            roomNumber: teacher.roomNumber || `Class ${classKey}`,
          });
        });
      });
    }

    if (entries.length) {
      await TimetableEntry.insertMany(entries, { ordered: false });
    }

    logger.info(`[${code}] Timetable seeded: ${slots.length} slots, ${createdTimetables.length} headers, ${entries.length} entries`);
  }
};

export default seedTimetable;

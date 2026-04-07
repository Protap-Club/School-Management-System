import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";
import {
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

    // 🔥 CLEAN OLD DATA
    const existing = await Timetable.find({ schoolId: school._id }).select("_id");
    await TimetableEntry.deleteMany({ timetableId: { $in: existing.map((t) => t._id) } });
    await Timetable.deleteMany({ schoolId: school._id });
    await TimeSlot.deleteMany({ schoolId: school._id });

    // 1️⃣ TIME SLOTS
    const slots = await TimeSlot.insertMany(
      ttData.timeSlots.map((slot) => ({
        ...slot,
        schoolId: school._id,
      }))
    );

    const slotByNumber = {};
    slots.forEach((slot) => {
      slotByNumber[slot.slotNumber] = slot;
    });

    // 2️⃣ TIMETABLE HEADERS
    const classSections = getSchoolClassSections(code);

    const timetableHeaders = classSections.map((cls) => ({
      schoolId: school._id,
      standard: String(cls.standard),
      section: String(cls.section).toUpperCase(),
      academicYear: ttData.academicYear || getAcademicYear(),
    }));

    const createdTimetables = await Timetable.insertMany(timetableHeaders);

    const timetableMap = {};
    createdTimetables.forEach((item) => {
      timetableMap[`${item.standard}-${item.section}`] = item._id;
    });

    // ✅ NEW LOGIC: FETCH TEACHER ASSIGNMENTS FROM TeacherProfile
    const TeacherProfile = (await import("../../module/user/model/TeacherProfile.model.js")).default;
    const teacherProfiles = await TeacherProfile.find({ schoolId: school._id }).lean();

    // Map: "standard-section-subject" -> teacherUserId
    const assignmentMap = new Map();
    teacherProfiles.forEach(profile => {
      profile.assignedClasses.forEach(ac => {
        const classKey = `${ac.standard}-${ac.section}`.toUpperCase();
        ac.subjects.forEach(sub => {
          assignmentMap.set(`${classKey}-${sub}`, profile.userId);
        });
      });
    });

    // 3️⃣ CREATE ENTRIES
    const entries = [];
    const classSlots = Object.values(slotByNumber)
      .filter((slot) => slot.slotType === "CLASS")
      .sort((a, b) => a.slotNumber - b.slotNumber);

    for (const timetable of createdTimetables) {
      const classKey = `${timetable.standard}-${timetable.section}`.toUpperCase();
      const subjects = getSubjectsForStandard(timetable.standard);

      // Create an offset so parallel sections don't get the same subject at the same time
      const sectionOffset = timetable.section.charCodeAt(0) - 65; // A=0, B=1, etc.
      const standardOffset = parseInt(timetable.standard, 10) || 0;
      const classOffset = sectionOffset + standardOffset;

      daysOfWeek.forEach((day, dayIndex) => {
        const dayShort = DAY_MAP[day];
        if (!dayShort) return;

        classSlots.forEach((slot, slotIndex) => {
          // Deterministic rotation to pick a subject for this slot, shifted by classOffset
          const subject = subjects[(slotIndex + dayIndex + classOffset) % subjects.length];
          const teacherId = assignmentMap.get(`${classKey}-${subject}`);

          if (teacherId) {
            entries.push({
              schoolId: school._id,
              timetableId: timetable._id,
              dayOfWeek: dayShort,
              timeSlotId: slot._id,
              subject,
              teacherId,
              roomNumber: `Class ${timetable.standard}-${timetable.section}`,
            });
          } else {
            logger.debug(`[${code}] No teacher assigned for ${classKey} -> ${subject}`);
          }
        });
      });
    }

    if (entries.length) {
      await TimetableEntry.insertMany(entries, { ordered: false });
    }

    logger.info(
      `[${code}] Timetable seeded: ${slots.length} slots, ${createdTimetables.length} timetables, ${entries.length} entries`
    );
  }
};

export default seedTimetable;
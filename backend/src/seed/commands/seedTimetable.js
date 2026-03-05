import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const ttData = loadSeedJson("timetable.json");

// Map full day names from seed data → short codes used in the schema enum
const DAY_MAP = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

const seedTimetable = async () => {
  logger.info("=== Seeding Timetable ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  // Clean up existing timetable data
  const existing = await Timetable.find({ schoolId: school._id }).select("_id");
  await TimetableEntry.deleteMany({ timetableId: { $in: existing.map((t) => t._id) } });
  await Timetable.deleteMany({ schoolId: school._id });
  await TimeSlot.deleteMany({ schoolId: school._id });

  // 1. Create TimeSlots
  const slots = await TimeSlot.insertMany(
    ttData.timeSlots.map((slot) => ({ ...slot, schoolId: school._id }))
  );
  const slotByNumber = {};
  slots.forEach((slot) => {
    slotByNumber[slot.slotNumber] = slot;
  });

  // 2. Create Timetable headers from the explicit timetables array
  const timetableHeaders = ttData.timetables.map((tt) => ({
    schoolId: school._id,
    standard: tt.standard,
    section: tt.section,
    academicYear: tt.academicYear,
  }));
  const createdTimetables = await Timetable.insertMany(timetableHeaders);

  // Build lookup: "standard-section" → timetable _id
  const timetableMap = {};
  createdTimetables.forEach((item) => {
    timetableMap[`${item.standard}-${item.section}`] = item._id;
  });

  // 3. Resolve teacher emails → user _ids
  const teacherEmails = [...new Set(ttData.entries.map((e) => e.teacherEmail))];
  const teachers = await User.find({
    schoolId: school._id,
    email: { $in: teacherEmails },
  }).select("_id email");
  const teacherIdByEmail = {};
  teachers.forEach((t) => {
    teacherIdByEmail[t.email] = t._id;
  });

  // 4. Create TimetableEntry documents from the explicit entries array
  const entries = [];
  for (const entry of ttData.entries) {
    const timetableId = timetableMap[entry.class];
    if (!timetableId) {
      logger.warn(`No timetable found for class: ${entry.class}, skipping entry`);
      continue;
    }

    const dayShort = DAY_MAP[entry.day];
    if (!dayShort) {
      logger.warn(`Unknown day: ${entry.day}, skipping entry`);
      continue;
    }

    const slot = slotByNumber[entry.slot];
    if (!slot) {
      logger.warn(`No time slot with number: ${entry.slot}, skipping entry`);
      continue;
    }

    const teacherId = teacherIdByEmail[entry.teacherEmail];
    if (!teacherId) {
      logger.warn(`Teacher not found: ${entry.teacherEmail}, skipping entry`);
      continue;
    }

    // Look up the subject from teacherSubjects map
    const subject = ttData.teacherSubjects[entry.teacherEmail] || "Unknown";

    entries.push({
      schoolId: school._id,
      timetableId,
      dayOfWeek: dayShort,
      timeSlotId: slot._id,
      subject,
      teacherId,
      roomNumber: entry.room || "",
    });
  }

  if (entries.length) {
    await TimetableEntry.insertMany(entries, { ordered: false });
  }

  logger.info(`Time slots seeded: ${slots.length}`);
  logger.info(`Timetables seeded: ${createdTimetables.length}`);
  logger.info(`Timetable entries seeded: ${entries.length}`);
};

export default seedTimetable;

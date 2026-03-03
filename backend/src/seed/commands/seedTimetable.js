import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const ttData = loadSeedJson("timetable.json");

const seedTimetable = async () => {
  logger.info("=== Seeding Timetable ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  const existing = await Timetable.find({ schoolId: school._id }).select("_id");
  await TimetableEntry.deleteMany({ timetableId: { $in: existing.map((t) => t._id) } });
  await Timetable.deleteMany({ schoolId: school._id });
  await TimeSlot.deleteMany({ schoolId: school._id });

  const slots = await TimeSlot.insertMany(ttData.timeSlots.map((slot) => ({ ...slot, schoolId: school._id })));
  const classSlots = slots.filter((slot) => slot.slotType === "CLASS");
  const slotByNumber = {};
  slots.forEach((slot) => {
    slotByNumber[slot.slotNumber] = slot;
  });

  const timetableHeaders = [];
  ttData.standards.forEach((standard) => {
    ttData.sections.forEach((section) => {
      timetableHeaders.push({
        schoolId: school._id,
        standard,
        section,
        academicYear: ttData.academicYear,
      });
    });
  });

  const createdTimetables = await Timetable.insertMany(timetableHeaders);
  const timetableMap = {};
  createdTimetables.forEach((item) => {
    timetableMap[`${item.standard}-${item.section}`] = item._id;
  });

  const teacherEmails = new Set();
  Object.values(ttData.subjectTeacherPools).forEach((arr) => arr.forEach((email) => teacherEmails.add(email)));
  const teachers = await User.find({ schoolId: school._id, email: { $in: [...teacherEmails] } }).select("_id email");
  const teacherIdByEmail = {};
  teachers.forEach((t) => {
    teacherIdByEmail[t.email] = t._id;
  });

  const entries = [];
  for (const standard of ttData.standards) {
    for (const section of ttData.sections) {
      const classKey = `${standard}-${section}`;
      const timetableId = timetableMap[classKey];
      const classType = ttData.classTypeByStandard[standard];
      const weekly = ttData.weeklyTemplateByClassType[classType];
      let roomNo = 1;

      for (const day of ttData.workingDays) {
        const subjects = weekly[day];
        subjects.forEach((subject, idx) => {
          const slot = classSlots[idx];
          if (!slot) return;
          const pool = ttData.subjectTeacherPools[subject] || [];
          if (!pool.length) return;

          const poolIdx = (idx + Number(standard) + (section === "A" ? 0 : 1)) % pool.length;
          const teacherEmail = pool[poolIdx];
          const teacherId = teacherIdByEmail[teacherEmail];
          if (!teacherId) return;

          entries.push({
            schoolId: school._id,
            timetableId,
            dayOfWeek: day,
            timeSlotId: slotByNumber[slot.slotNumber]._id,
            subject,
            teacherId,
            roomNumber: `${ttData.roomByStandard[standard]}-R${String(roomNo).padStart(2, "0")}`,
          });
          roomNo = roomNo === 4 ? 1 : roomNo + 1;
        });
      }
    }
  }

  if (entries.length) {
    await TimetableEntry.insertMany(entries, { ordered: false });
  }

  logger.info(`Time slots seeded: ${slots.length}`);
  logger.info(`Timetables seeded: ${createdTimetables.length}`);
  logger.info(`Timetable entries seeded: ${entries.length}`);
};

export default seedTimetable;


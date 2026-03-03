import Attendance from "../../module/attendence/Attendance.model.js";
import School from "../../module/school/School.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const attData = loadSeedJson("attendance.json");

const toDateKey = (date) => date.toISOString().slice(0, 10);

const isWorkingDay = (date, allowedDays, excluded) => {
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = shortDays[date.getDay()];
  return allowedDays.includes(day) && !excluded.has(toDateKey(date));
};

const hashInt = (input) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
};

const workingDatesInRange = (start, end, workingDays, excludedDates) => {
  const dates = [];
  const cursor = new Date(start);
  const endDate = new Date(end);
  const excluded = new Set(excludedDates);

  while (cursor <= endDate) {
    if (isWorkingDay(cursor, workingDays, excluded)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const seedAttendance = async () => {
  logger.info("=== Seeding Attendance ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  const profiles = await StudentProfile.find({ schoolId: school._id }).select("userId standard");
  if (!profiles.length) {
    logger.warn("No student profiles found. Run seed-profiles first.");
    return;
  }

  const dates = workingDatesInRange(
    attData.range.startDate,
    attData.range.endDate,
    attData.workingDays,
    attData.excludeDates || []
  );

  const dateValues = dates.map((d) => {
    const dt = new Date(d);
    dt.setUTCHours(0, 0, 0, 0);
    return dt;
  });

  await Attendance.deleteMany({
    schoolId: school._id,
    date: { $in: dateValues },
  });

  const records = [];
  profiles.forEach((profile, idx) => {
    const prob = attData.presentProbabilityByStandard[profile.standard] ?? 0.9;
    dates.forEach((date) => {
      const dateKey = toDateKey(date);
      const key = `${profile.userId.toString()}-${dateKey}-${idx}`;
      const ratio = (hashInt(key) % 1000) / 1000;
      const isPresent = ratio <= prob;
      let checkInTime = null;
      let markedBy = "Manual";
      let remarks = null;

      if (isPresent) {
        const spread = hashInt(`${key}-in`) % attData.checkInWindow.maxSpreadMinutes;
        const hh = attData.checkInWindow.startHour;
        const mm = attData.checkInWindow.startMinute + spread;
        checkInTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hh, mm, 0, 0));
        markedBy = spread % 4 === 0 ? "Manual" : "NFC";
      } else {
        remarks = attData.absenceReasons[hashInt(`${key}-reason`) % attData.absenceReasons.length];
      }

      records.push({
        studentId: profile.userId,
        schoolId: school._id,
        date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)),
        status: isPresent ? "Present" : "Absent",
        checkInTime,
        markedBy,
        remarks,
      });
    });
  });

  if (records.length) {
    await Attendance.insertMany(records, { ordered: false });
  }

  logger.info(`Attendance records seeded: ${records.length} across ${dates.length} working days`);
};

export default seedAttendance;


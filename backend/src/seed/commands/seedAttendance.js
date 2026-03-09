import Attendance from "../../module/attendence/Attendance.model.js";
import School from "../../module/school/School.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const attData = loadSeedJson("attendance.json");

/**
 * Simple deterministic hash so results are reproducible across runs.
 */
const hashInt = (input) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
};

const seedAttendance = async () => {
  logger.info("=== Seeding Attendance ===");

  const school = await School.findOne({ code: "NV" });
  if (!school) throw new Error("School not found. Run seed-school first.");

  const profiles = await StudentProfile.find({ schoolId: school._id }).select(
    "userId standard section"
  );
  if (!profiles.length) {
    logger.warn("No student profiles found. Run seed-profiles first.");
    return;
  }

  // Parse configuration from the simplified attendance.json
  const dates = (attData.dates || []).map((d) => new Date(d));
  if (!dates.length) {
    logger.warn("No dates in attendance.json, skipping attendance seeding.");
    return;
  }

  const presentPct = (attData.presentPercentage ?? 85) / 100;
  const defaultRemarks = attData.absentRemarks || "Absent without notice";
  const targetStandard = attData.targetClass?.standard;
  const targetSection = attData.targetClass?.section;

  // Clean up existing records for these dates
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
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (const profile of profiles) {
    // Apply the configured presentPercentage to target class,
    // use a slightly different rate for other classes
    const isTarget =
      targetStandard &&
      profile.standard === targetStandard &&
      (!targetSection || profile.section === targetSection);
    const prob = isTarget ? presentPct : 0.9;

    for (const date of dates) {
      const dateKey = date.toISOString().slice(0, 10);
      const key = `${profile.userId.toString()}-${dateKey}`;
      const ratio = (hashInt(key) % 1000) / 1000;
      const isPresent = ratio <= prob;

      let checkInTime = null;
      let markedBy = "Manual";
      let remarks = null;

      if (isPresent) {
        // Generate a spread for check-in time between 7:30 – 8:15 AM
        const spread = hashInt(`${key}-in`) % 45;
        checkInTime = new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            7,
            30 + spread,
            0,
            0
          )
        );
        markedBy = spread % 4 === 0 ? "Manual" : "NFC";
      } else {
        remarks = defaultRemarks;
      }

      records.push({
        studentId: profile.userId,
        schoolId: school._id,
        date: new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            0,
            0,
            0,
            0
          )
        ),
        status: isPresent ? "Present" : "Absent",
        checkInTime,
        markedBy,
        remarks,
      });

      // Flush in batches to avoid memory pressure
      if (records.length >= BATCH_SIZE) {
        await Attendance.insertMany(records, { ordered: false });
        totalInserted += records.length;
        records.length = 0;
      }
    }
  }

  // Insert remaining records
  if (records.length) {
    await Attendance.insertMany(records, { ordered: false });
    totalInserted += records.length;
  }

  logger.info(
    `Attendance records seeded: ${totalInserted} for ${profiles.length} students across ${dates.length} dates`
  );
};

export default seedAttendance;

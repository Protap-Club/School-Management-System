import Attendance from "../../module/attendance/Attendance.model.js";
import School from "../../module/school/School.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const attData = loadSeedJson("attendance.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

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

  const dates = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let d = new Date(today);
  
  while (dates.length < 90) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (d.getUTCDay() !== 0) { // 0 is Sunday
      dates.push(new Date(d));
    }
  }

  const defaultRemarks = attData.absentRemarks || "Absent without notice";

  const getStandardRate = (standard) => {
    const s = parseInt(standard) || 1;
    // Standards 1-5 (~95%), Standards 10-12 (~82%)
    return 0.96 - ((s - 1) * 0.012);
  };

  const dateValues = dates.map((dt) => {
    const dCopy = new Date(dt);
    dCopy.setUTCHours(0, 0, 0, 0);
    return dCopy;
  });

  for (const schoolDef of schoolsDef) {
    const school = await School.findOne({ code: schoolDef.code });
    if (!school) continue;

    const profiles = await StudentProfile.find({ schoolId: school._id }).select("userId standard section");
    if (!profiles.length) {
      logger.warn(`[${schoolDef.code}] No student profiles found. Skipping.`);
      continue;
    }

    await Attendance.deleteMany({
      schoolId: school._id,
      date: { $in: dateValues },
    });

    const records = [];
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (const profile of profiles) {
      const baseProb = getStandardRate(profile.standard);
      // Deterministic personal attendance factor (-5% to +5% modifier)
      const studentJitter = ((hashInt(profile.userId.toString()) % 100) - 50) / 1000;
      const prob = Math.min(0.99, Math.max(0.60, baseProb + studentJitter));

      for (const date of dates) {
        const dateKey = date.toISOString().slice(0, 10);
        const key = `${profile.userId.toString()}-${dateKey}`;
        const ratio = (hashInt(key) % 1000) / 1000;
        const isPresent = ratio <= prob;

        let checkInTime = null;
        let markedBy = "Manual";
        let remarks = null;

        if (isPresent) {
          const spread = hashInt(`${key}-in`) % 45;
          checkInTime = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 7, 30 + spread, 0, 0)
          );
          markedBy = spread % 4 === 0 ? "Manual" : "NFC";
        } else {
          remarks = defaultRemarks;
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

        if (records.length >= BATCH_SIZE) {
          await Attendance.insertMany(records, { ordered: false });
          totalInserted += records.length;
          records.length = 0;
        }
      }
    }

    if (records.length) {
      await Attendance.insertMany(records, { ordered: false });
      totalInserted += records.length;
    }

    logger.info(`[${schoolDef.code}] Attendance seeded: ${totalInserted} records for ${profiles.length} students`);
  }
};

export default seedAttendance;

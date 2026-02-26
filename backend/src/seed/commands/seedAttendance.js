// Seeds attendance records for target class from attendance.json
import { createRequire } from "module";
import Attendance from "../../module/attendence/Attendance.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const attData = require("../data/attendance.json");

const seedAttendance = async () => {
    logger.info("═══ Seeding Attendance ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    // Find students in the target class by matching their profile data
    const StudentProfile = (await import("../../module/user/model/StudentProfile.model.js")).default;
    const profiles = await StudentProfile.find({
        schoolId: school._id,
        standard: attData.targetClass.standard,
        section: attData.targetClass.section,
    }).select("userId");

    if (profiles.length === 0) {
        logger.warn(`No students found in class ${attData.targetClass.standard}-${attData.targetClass.section}`);
        return;
    }

    const studentIds = profiles.map(p => p.userId);
    logger.info(`Found ${studentIds.length} students in ${attData.targetClass.standard}-${attData.targetClass.section}`);

    // Clear existing attendance for these dates
    const dates = attData.dates.map(d => new Date(d));
    await Attendance.deleteMany({ schoolId: school._id, date: { $in: dates } });

    // Generate records — ~85% present, ~15% absent
    const records = [];
    for (const dateStr of attData.dates) {
        const date = new Date(dateStr);
        studentIds.forEach((sid, idx) => {
            const isPresent = idx % 7 !== 0;
            records.push({
                studentId: sid,
                schoolId: school._id,
                date,
                status: isPresent ? "Present" : "Absent",
                checkInTime: isPresent ? new Date(`${dateStr}T08:${String(5 + (idx % 50)).padStart(2, "0")}:00.000Z`) : null,
                remarks: isPresent ? null : attData.absentRemarks,
            });
        });
    }

    await Attendance.insertMany(records);
    logger.info(`Attendance records → ${records.length} (${attData.dates.length} days)`);
};

export default seedAttendance;

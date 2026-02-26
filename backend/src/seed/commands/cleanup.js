// Clears ALL Navrachna seed data from the database
import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import AdminProfile from "../../module/user/model/AdminProfile.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import Attendance from "../../module/attendence/Attendance.model.js";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import { Notice, NoticeGroup } from "../../module/notice/Notice.model.js";
import logger from "../../config/logger.js";

const cleanup = async () => {
    logger.info("═══ Cleanup — Removing ALL Navrachna data ═══");

    // Find all NV schools (handles orphan duplicates too)
    const schools = await School.find({ code: "NV" }).select("_id");
    const schoolIds = schools.map(s => s._id);

    if (schoolIds.length === 0) {
        logger.info("No Navrachna school found. Nothing to clean.");
        return;
    }

    // Also delete users with @nv.com emails to catch orphans from failed runs
    const emailResult = await User.deleteMany({ email: { $regex: /@nv\.com$/i } });
    logger.info(`Users (by email) → ${emailResult.deletedCount}`);

    const profileFilter = { schoolId: { $in: schoolIds } };
    const ap = await AdminProfile.deleteMany(profileFilter);
    const tp = await TeacherProfile.deleteMany(profileFilter);
    const sp = await StudentProfile.deleteMany(profileFilter);
    logger.info(`Profiles → admin: ${ap.deletedCount}, teacher: ${tp.deletedCount}, student: ${sp.deletedCount}`);

    await TimeSlot.deleteMany({ schoolId: { $in: schoolIds } });
    const tts = await Timetable.find({ schoolId: { $in: schoolIds } }).select("_id");
    await TimetableEntry.deleteMany({ timetableId: { $in: tts.map(t => t._id) } });
    await Timetable.deleteMany({ schoolId: { $in: schoolIds } });
    logger.info("Timetable data → cleared");

    await Attendance.deleteMany({ schoolId: { $in: schoolIds } });
    logger.info("Attendance → cleared");

    await CalendarEvent.deleteMany({ schoolId: { $in: schoolIds } });
    logger.info("Calendar events → cleared");

    await Notice.deleteMany({ schoolId: { $in: schoolIds } });
    await NoticeGroup.deleteMany({ schoolId: { $in: schoolIds } });
    logger.info("Notices → cleared");

    // Delete the school itself last
    await School.deleteMany({ code: "NV" });
    logger.info("School → deleted");

    logger.info("═══ Cleanup complete ═══");
};

export default cleanup;

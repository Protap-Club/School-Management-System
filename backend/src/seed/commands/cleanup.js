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
  logger.info("=== Cleanup: removing seeded NV school data ===");

  const schools = await School.find({ code: "NV" }).select("_id");
  const schoolIds = schools.map((s) => s._id);
  const usersInSchools = await User.find({ schoolId: { $in: schoolIds } }).select("_id");
  const userIds = usersInSchools.map((u) => u._id);

  await Notice.deleteMany({ schoolId: { $in: schoolIds } });
  await NoticeGroup.deleteMany({ schoolId: { $in: schoolIds } });

  await CalendarEvent.deleteMany({ schoolId: { $in: schoolIds } });

  const timetables = await Timetable.find({ schoolId: { $in: schoolIds } }).select("_id");
  await TimetableEntry.deleteMany({ timetableId: { $in: timetables.map((t) => t._id) } });
  await Timetable.deleteMany({ schoolId: { $in: schoolIds } });
  await TimeSlot.deleteMany({ schoolId: { $in: schoolIds } });

  await Attendance.deleteMany({ schoolId: { $in: schoolIds } });

  await StudentProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await TeacherProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await AdminProfile.deleteMany({ userId: { $in: userIds } });

  await User.deleteMany({
    $or: [
      { schoolId: { $in: schoolIds } },
      { email: { $regex: /@nv\.com$/i } },
    ],
  });

  await School.deleteMany({ code: "NV" });
  logger.info("Cleanup completed");
};

export default cleanup;


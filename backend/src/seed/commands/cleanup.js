import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import AdminProfile from "../../module/user/model/AdminProfile.model.js";
import TeacherProfile from "../../module/user/model/TeacherProfile.model.js";
import StudentProfile from "../../module/user/model/StudentProfile.model.js";
import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import Attendance from "../../module/attendance/Attendance.model.js";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import { Notice, NoticeGroup } from "../../module/notice/Notice.model.js";
import { Assignment } from "../../module/assignment/Assignment.model.js";
import { Submission } from "../../module/assignment/Submission.model.js";
import Exam from "../../module/examination/Exam.model.js";
import Result from "../../module/result/result.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const { schools: schoolsDef } = loadSeedJson("schools.json");

const cleanup = async () => {
  const codes = schoolsDef.map((s) => s.code);
  logger.info(`=== Cleanup: removing seeded data for [${codes.join(", ")}] ===`);

  const schools = await School.find({ code: { $in: codes } }).select("_id");
  const schoolIds = schools.map((s) => s._id);
  const usersInSchools = await User.find({ schoolId: { $in: schoolIds } }).select("_id");
  const userIds = usersInSchools.map((u) => u._id);

  await Notice.deleteMany({ schoolId: { $in: schoolIds } });
  await NoticeGroup.deleteMany({ schoolId: { $in: schoolIds } });
  await CalendarEvent.deleteMany({ schoolId: { $in: schoolIds } });
  await Submission.deleteMany({ schoolId: { $in: schoolIds } });
  await Assignment.deleteMany({ schoolId: { $in: schoolIds } });
  await Result.deleteMany({ schoolId: { $in: schoolIds } });
  await Exam.deleteMany({ schoolId: { $in: schoolIds } });

  const timetables = await Timetable.find({ schoolId: { $in: schoolIds } }).select("_id");
  await TimetableEntry.deleteMany({ timetableId: { $in: timetables.map((t) => t._id) } });
  await Timetable.deleteMany({ schoolId: { $in: schoolIds } });
  await TimeSlot.deleteMany({ schoolId: { $in: schoolIds } });

  await Attendance.deleteMany({ schoolId: { $in: schoolIds } });

  await StudentProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await TeacherProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await AdminProfile.deleteMany({ userId: { $in: userIds } });

  const emailDomains = codes.map((c) => c.toLowerCase());
  const emailRegex = new RegExp(`@(${emailDomains.join("|")})\\.com$`, "i");
  await User.deleteMany({
    $or: [
      { schoolId: { $in: schoolIds } },
      { email: { $regex: emailRegex } },
    ],
  });

  await School.deleteMany({ code: { $in: codes } });
  logger.info("Cleanup completed for all seeded schools.");
};

export default cleanup;

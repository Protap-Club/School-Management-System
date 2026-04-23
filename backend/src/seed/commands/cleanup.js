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
import { FeeAssignment, FeePayment, FeeStructure, StudentPenalty } from "../../module/fees/Fee.model.js";
import { FeeType } from "../../module/fees/FeeType.model.js";
import Salary from "../../module/fees/Salary.model.js";
import { AuditLog } from "../../module/audit/AuditLog.model.js";
import { ProxyAssignment, ProxyRequest } from "../../module/proxy/Proxy.model.js";
import RefreshToken from "../../module/auth/RefreshToken.model.js";
import PasswordResetToken from "../../module/auth/PasswordResetToken.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const { schools: schoolsDef } = loadSeedJson("schools.json");
const legacySchoolCodes = ["AV"];

const cleanup = async () => {
  const codes = [...new Set([...schoolsDef.map((s) => s.code), ...legacySchoolCodes])];
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
  await FeePayment.deleteMany({ schoolId: { $in: schoolIds } });
  await FeeAssignment.deleteMany({ schoolId: { $in: schoolIds } });
  await FeeStructure.deleteMany({ schoolId: { $in: schoolIds } });
  await StudentPenalty.deleteMany({ schoolId: { $in: schoolIds } });
  await FeeType.deleteMany({ schoolId: { $in: schoolIds } });
  await Salary.deleteMany({ schoolId: { $in: schoolIds } });
  await AuditLog.deleteMany({ schoolId: { $in: schoolIds } });
  await ProxyAssignment.deleteMany({ schoolId: { $in: schoolIds } });
  await ProxyRequest.deleteMany({ schoolId: { $in: schoolIds } });

  const timetables = await Timetable.find({ schoolId: { $in: schoolIds } }).select("_id");
  await TimetableEntry.deleteMany({ timetableId: { $in: timetables.map((t) => t._id) } });
  await Timetable.deleteMany({ schoolId: { $in: schoolIds } });
  await TimeSlot.deleteMany({ schoolId: { $in: schoolIds } });

  await Attendance.deleteMany({ schoolId: { $in: schoolIds } });

  await StudentProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await TeacherProfile.deleteMany({ schoolId: { $in: schoolIds } });
  await AdminProfile.deleteMany({ userId: { $in: userIds } });
  await RefreshToken.deleteMany({ userId: { $in: userIds } });
  await PasswordResetToken.deleteMany({ userId: { $in: userIds } });

  const emailDomains = [...new Set([...codes.map((c) => c.toLowerCase()), "ambevidyalaya"])];
  const emailRegex = new RegExp(`@(${emailDomains.join("|")})\\.(com|edu\\.in)$`, "i");
  await User.deleteMany({
    $or: [
      { schoolId: { $in: schoolIds } },
      { email: { $regex: emailRegex } },
      { email: { $regex: /@ambe/i } },
    ],
  });

  await School.deleteMany({ code: { $in: codes } });
  logger.info("Cleanup completed for all seeded schools.");
};

export default cleanup;

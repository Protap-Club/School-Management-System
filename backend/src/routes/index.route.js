import express from "express";
import authRoutes from "../module/auth/auth.route.js";
import userRoutes from "../module/user/user.route.js";
import schoolRoutes from "../module/school/school.route.js";
import timetableRoutes from "../module/timetable/timetable.route.js"; // Will handle timeslots routes too?
import timeSlotRoutes from "../module/timetable/timeslot.route.js"; // User listed them separately
import scheduleRoutes from "../module/school/schedule.route.js";
import attendanceRoutes from "../module/attendence/attendance.route.js"; // Keeping existing functionality
import calendarRoutes from "../module/calendar/calendar.route.js"; // Calendar events
import noticeRoutes from "../module/notice/notice.route.js"; // Notice & Groups

const router = express.Router();

router.use("/auth", authRoutes);
router.use(["/user", "/users"], userRoutes);
router.use("/school", schoolRoutes);
router.use(["/timeslot", "/timeslots", "/timetable/time-slots"], timeSlotRoutes);
router.use(["/timetable", "/timetables"], timetableRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/attendance", attendanceRoutes); // For NFC/Attendance
router.use(["/calendar", "/events"], calendarRoutes); // Calendar & Events
router.use("/notices", noticeRoutes); // Notice Board & Groups

export default router;

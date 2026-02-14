import express from "express";
import authRoutes from "../module/auth/auth.route.js";
import userRoutes from "../module/user/user.route.js";
import schoolRoutes from "../module/school/school.route.js";
import timetableRoutes from "../module/timetable/timetable.route.js"; // Will handle timeslots routes too?
import attendanceRoutes from "../module/attendence/attendance.route.js"; // Keeping existing functionality
import calendarRoutes from "../module/calendar/calendar.route.js"; // Calendar events
import noticeRoutes from "../module/notice/notice.route.js"; // Notice & Groups
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// CORE ROUTES

// Authentication (login, register, logout)
router.use("/auth", authRoutes);    // login, forgot-password

// Protected route
router.use(checkAuth);

router.use("/users", userRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/timetables", timetableRoutes);
router.use("/notices", noticeRoutes);
router.use("/calendar", calendarRoutes);
router.use("/school", schoolRoutes);

export default router;

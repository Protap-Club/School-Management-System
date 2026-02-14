import express from "express";
import authRoutes from "../module/auth/auth.route.js";
import userRoutes from "../module/user/user.route.js";
import schoolRoutes from "../module/school/school.route.js";
import attendanceRoutes from "../module/attendence/attendance.route.js";
import noticeRoutes from "../module/notice/notice.route.js";
import calendarRoutes from "../module/calendar/calendar.route.js";
import timetableRoutes from "../module/timetable/timetable.route.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public
router.use("/auth", authRoutes);

// Protected (all below need auth)
router.use(checkAuth);

router.use("/users", userRoutes);
router.use("/school", schoolRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/notices", noticeRoutes);
router.use("/calendar", calendarRoutes);
router.use("/timetables", timetableRoutes);

export default router;


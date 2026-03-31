import express from "express";
import authRoutes from "../module/auth/auth.route.js";
import userRoutes from "../module/user/user.route.js";
import schoolRoutes from "../module/school/school.route.js";
import attendanceRoutes from "../module/attendance/attendance.route.js";
import noticeRoutes from "../module/notice/notice.route.js";
import calendarRoutes from "../module/calendar/calendar.route.js";
import timetableRoutes from "../module/timetable/timetable.route.js";
import feesRoutes from "../module/fees/fees.route.js";
import examinationRoutes from "../module/examination/examination.route.js";
import assignmentRoutes from "../module/assignment/assignment.route.js";
import resultRoutes from "../module/result/result.route.js";
import securityRoutes from "../module/security/security.route.js";
import dashboardRoutes from "../module/dashboard/dashboard.route.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import extractSchoolId from "../middlewares/school.middleware.js";

const router = express.Router();

// Public
router.use("/auth", authRoutes);

// NFC device endpoint — uses its own device-key auth, must come before global checkAuth
router.use("/attendance", attendanceRoutes);
router.use("/security", securityRoutes);

// Protected (all below need auth)
router.use(checkAuth);
router.use(extractSchoolId);

router.use("/users", userRoutes);
router.use("/school", schoolRoutes);
router.use("/notices", noticeRoutes);
router.use("/calendar", calendarRoutes);
router.use("/timetables", timetableRoutes);
router.use("/fees", feesRoutes);
router.use("/examinations", examinationRoutes);
router.use("/results", resultRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;


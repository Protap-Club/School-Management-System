import express from "express";
import authRoutes from "../module/auth/auth.route.js";
import userRoutes from "../module/user/user.route.js";
import schoolRoutes from "../module/school/school.route.js";
import attendanceRoutes from "../module/attendence/attendance.route.js";
import noticeRoutes from "../module/notice/notice.route.js";
import calendarRoutes from "../module/calendar/calendar.route.js";
import timetableRoutes from "../module/timetable/timetable.route.js";
import feesRoutes from "../module/fees/fees.route.js";
import examinationRoutes from "../module/examination/examination.route.js";
import assignmentRoutes from "../module/assignment/assignment.route.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import extractSchoolId from "../middlewares/school.middleware.js";

const router = express.Router();

// Public
router.use("/auth", authRoutes);

// NFC device endpoint — uses its own device-key auth, must come before global checkAuth
router.use("/attendance", attendanceRoutes);

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
router.use("/assignments", assignmentRoutes);

export default router;


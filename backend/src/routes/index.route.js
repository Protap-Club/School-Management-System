import express from "express";
import { rateLimit } from "express-rate-limit";
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
import proxyRoutes from "../module/proxy/proxy.route.js";
import auditRoutes from "../module/audit/audit.route.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import extractSchoolId from "../middlewares/school.middleware.js";

const router = express.Router();

// Rate limiters — brute-force protection
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 20,                     // 20 attempts per window per IP
    standardHeaders: true,       // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED' } },
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,                    // Raised from 200 — admin batch ops (multi-class fee creation) legitimately need more headroom
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMIT_EXCEEDED' } },
});

// Apply general rate limiter to all API routes
router.use(generalLimiter);

// Public
// Auth routes already have dedicated login/refresh rate limiters inside auth.route.js.
// Avoid stacking extra auth/general limiters here because that makes refresh/login
// flows hit multiple independent 429 thresholds for the same request.
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
router.use("/proxies", proxyRoutes);
router.use("/audit", auditRoutes);

export default router;


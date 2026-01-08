import express from "express";
import {
    markAttendance,
    getAttendanceByDate,
    getStudentsForAttendance,
    checkAttendanceAccess
} from "../controllers/attendance.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// GET /api/v1/attendance/check-access - Check if attendance is enabled
router.get(
    "/check-access",
    checkAuth,
    checkAttendanceAccess
);

// GET /api/v1/attendance/students - Get students for attendance
router.get(
    "/students",
    checkAuth,
    checkRole([USER_ROLES.TEACHER]),
    getStudentsForAttendance
);

// GET /api/v1/attendance - Get attendance by date
router.get(
    "/",
    checkAuth,
    checkRole([USER_ROLES.TEACHER]),
    getAttendanceByDate
);

// POST /api/v1/attendance/mark - Mark attendance
router.post(
    "/mark",
    checkAuth,
    checkRole([USER_ROLES.TEACHER]),
    markAttendance
);

export default router;

import express from "express";
import { markAttendance, getAttendanceByDate, getStudentsForAttendance, checkAttendanceAccess } from "../controllers/attendance.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { checkAttendanceFeature } from "../middlewares/institute.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// Check access doesn't need the feature check (it IS the feature check)
router.get("/check-access", checkAuth, checkAttendanceAccess);

// All other routes require attendance feature to be enabled
router.get("/students", checkAuth, checkRole([USER_ROLES.TEACHER]), checkAttendanceFeature, getStudentsForAttendance);
router.get("/", checkAuth, checkRole([USER_ROLES.TEACHER]), checkAttendanceFeature, getAttendanceByDate);
router.post("/mark", checkAuth, checkRole([USER_ROLES.TEACHER]), checkAttendanceFeature, markAttendance);

export default router;

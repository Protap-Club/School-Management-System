import express from "express";
import { markAttendance, getAttendanceByDate, getStudentsForAttendance, checkAttendanceAccess } from "../controllers/attendance.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

router.get("/check-access", checkAuth, checkAttendanceAccess);
router.get("/students", checkAuth, checkRole([USER_ROLES.TEACHER]), getStudentsForAttendance);
router.get("/", checkAuth, checkRole([USER_ROLES.TEACHER]), getAttendanceByDate);
router.post("/mark", checkAuth, checkRole([USER_ROLES.TEACHER]), markAttendance);

export default router;

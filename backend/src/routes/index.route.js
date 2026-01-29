import express from "express";
import authRoutes from "./auth.route.js";
import userRoutes from "./user.route.js";
import schoolRoutes from "./school.route.js";
import timetableRoutes from "./timetable.route.js"; // Will handle timeslots routes too?
import timeSlotRoutes from "./timeslot.route.js"; // User listed them separately
import scheduleRoutes from "./schedule.route.js";
import attendanceRoutes from "./attendance.route.js"; // Keeping existing functionality

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/school", schoolRoutes);
router.use("/timeslots", timeSlotRoutes);
router.use("/timetables", timetableRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/attendance", attendanceRoutes); // For NFC/Attendance

export default router;

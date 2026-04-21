import express from "express";
import {
    createTimetable,
    getTimetables,
    getTimetableById,
    deleteTimetable,
    createTimeSlot,
    getTimeSlots,
    updateTimeSlot,
    deleteTimeSlot,
    addEntry,
    updateEntry,
    deleteEntry,
    getTeacherSchedule,
    getMyTimetable,
    getMyClassTimetable,
} from "./timetable.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";

import { requireFeature } from "../../middlewares/feature.middleware.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createTimetableSchema,
    timetableIdParamsSchema,
    createTimeSlotSchema,
    updateTimeSlotSchema,
    timeSlotIdParamsSchema,
    createEntrySchema,
    updateEntrySchema,
    entryIdParamsSchema,
    teacherScheduleParamsSchema,
} from "./timetable.validation.js";

const router = express.Router();

// applied to all timetable routes
// checks if timetable feature is enabled for the school
router.use(requireFeature("timetable"));

// SCHEDULE VIEWS
// these routes are for teachers and students to view their own schedules
// placed first because /schedule/me and /schedule/:teacherId must match before /:id

// teacher or student can view their own weekly timetable (works on both web and mobile)
router.get("/schedule/me", checkRole([USER_ROLES.TEACHER, USER_ROLES.STUDENT]), getMyTimetable);

// teacher can view their assigned class's timetable (only for class teachers)
router.get("/schedule/class", checkRole([USER_ROLES.TEACHER]), getMyClassTimetable);

// admin can view any teacher's schedule (web only)
router.get("/schedule/:teacherId", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(teacherScheduleParamsSchema), getTeacherSchedule);

// TIME SLOTS (bell schedule)
// time slots define the school's period timings (e.g., Period 1: 9:00-9:45)

// all authenticated roles can view the bell schedule
router.get("/slots", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), getTimeSlots);

// only admin can create, update or delete time slots (web only)
router.post("/slots", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(createTimeSlotSchema), createTimeSlot);
router.put("/slots/:id", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(updateTimeSlotSchema), updateTimeSlot);
router.delete("/slots/:id", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(timeSlotIdParamsSchema), deleteTimeSlot);

// TIMETABLE ENTRIES
// entries are individual cells in the timetable (day + period + subject + teacher)
// all entry operations are admin-only and web-only

// add a new entry to a timetable (e.g., assign a teacher to Monday Period 3)
router.post("/:id/entries", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(createEntrySchema), addEntry);

// update an existing entry (e.g., change the teacher or subject)
router.patch("/entries/:entryId", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(updateEntrySchema), updateEntry);

// delete an entry from a timetable
router.delete("/entries/:entryId", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(entryIdParamsSchema), deleteEntry);

// TIMETABLE CRUD
// timetable headers represent a class schedule (e.g., "Class 10-A, Academic Year 2025")
// admin-only and web-only — teachers/students use /schedule/me instead

// create a new timetable for a class + section + academic year
router.post("/", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(createTimetableSchema), createTimetable);

// list all timetable headers for the school (for admin management page)
router.get("/", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getTimetables);

// get a specific timetable with all its entries populated
router.get("/:id", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(timetableIdParamsSchema), getTimetableById);

// delete a timetable and all its entries
router.delete("/:id", checkWebOnly, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(timetableIdParamsSchema), deleteTimetable);

export default router;

/**
 * Timetable Routes - API endpoints for Timetable feature.
 * Access: Admin (full) | Teacher (read-only, own schedule)
 */

import express from "express";
import {
    createTimeSlot, getTimeSlots, updateTimeSlot, deleteTimeSlot,
    createTimetable, getTimetables, getTimetableById, updateTimetableStatus, deleteTimetable,
    createEntry, createBulkEntries, updateEntry, deleteEntry,
    getTeacherSchedule
} from "../controllers/timetable.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { requireFeature } from "../middlewares/feature.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import extractSchoolId from "../middlewares/school.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createTimeSlotSchema, updateTimeSlotSchema, timeSlotIdParamsSchema,
    createTimetableSchema, timetableIdParamsSchema, updateTimetableStatusSchema,
    createEntrySchema, createBulkEntriesSchema, updateEntrySchema, entryIdParamsSchema,
    teacherScheduleParamsSchema
} from "../validations/timetable.validation.js";

const router = express.Router();

// All routes require authentication, school context, and timetable feature enabled
router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature('timetable'));

// ═══════════════════════════════════════════════════════════════
// TimeSlot Routes
// ═══════════════════════════════════════════════════════════════

// GET /time-slots - Admin + Teacher can view
router.get(
    "/time-slots",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    getTimeSlots
);

// POST /time-slots - Admin only
router.post(
    "/time-slots",
    checkRole([USER_ROLES.ADMIN]),
    validate(createTimeSlotSchema),
    createTimeSlot
);

// PUT /time-slots/:id - Admin only
router.put(
    "/time-slots/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(updateTimeSlotSchema),
    updateTimeSlot
);

// DELETE /time-slots/:id - Admin only
router.delete(
    "/time-slots/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(timeSlotIdParamsSchema),
    deleteTimeSlot
);

// ═══════════════════════════════════════════════════════════════
// Timetable Routes
// ═══════════════════════════════════════════════════════════════

// GET /timetables - Admin only
router.get(
    "/timetables",
    checkRole([USER_ROLES.ADMIN]),
    getTimetables
);

// GET /timetables/:id - Admin only
router.get(
    "/timetables/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(timetableIdParamsSchema),
    getTimetableById
);

// POST /timetables - Admin only
router.post(
    "/timetables",
    checkRole([USER_ROLES.ADMIN]),
    validate(createTimetableSchema),
    createTimetable
);

// PATCH /timetables/:id/status - Admin only (publish/draft)
router.patch(
    "/timetables/:id/status",
    checkRole([USER_ROLES.ADMIN]),
    validate(updateTimetableStatusSchema),
    updateTimetableStatus
);

// DELETE /timetables/:id - Admin only
router.delete(
    "/timetables/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(timetableIdParamsSchema),
    deleteTimetable
);

// ═══════════════════════════════════════════════════════════════
// TimetableEntry Routes
// ═══════════════════════════════════════════════════════════════

// POST /timetables/:id/entries - Admin only
router.post(
    "/timetables/:id/entries",
    checkRole([USER_ROLES.ADMIN]),
    validate(createEntrySchema),
    createEntry
);

// POST /timetables/:id/entries/bulk - Admin only
router.post(
    "/timetables/:id/entries/bulk",
    checkRole([USER_ROLES.ADMIN]),
    validate(createBulkEntriesSchema),
    createBulkEntries
);

// PUT /entries/:id - Admin only
router.put(
    "/entries/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(updateEntrySchema),
    updateEntry
);

// DELETE /entries/:id - Admin only
router.delete(
    "/entries/:id",
    checkRole([USER_ROLES.ADMIN]),
    validate(entryIdParamsSchema),
    deleteEntry
);

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule Route
// ═══════════════════════════════════════════════════════════════

// GET /teacher-schedule/:teacherId - Admin (any) | Teacher (self only)
router.get(
    "/teacher-schedule/:teacherId",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(teacherScheduleParamsSchema),
    getTeacherSchedule
);

export default router;

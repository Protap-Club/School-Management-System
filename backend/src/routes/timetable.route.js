import express from "express";
import {
    createTimetable,
    getTimetables,
    getTimetableById,
    updateTimetableStatus,
    deleteTimetable,
    addEntry,
    syncTimetableEntries,
    updateEntry,
    deleteEntry,
    getTeacherSchedule
} from "../controllers/timetable.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { requireFeature } from "../middlewares/feature.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import extractSchoolId from "../middlewares/school.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createTimetableSchema,
    timetableIdParamsSchema,
    updateTimetableStatusSchema,
    createEntrySchema,
    createBulkEntriesSchema,
    updateEntrySchema,
    entryIdParamsSchema
} from "../validations/timetable.validation.js";

const router = express.Router();

router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature('timetable'));

// --- Management ---

// GET /api/v1/timetables (Admin + Teacher can view)
router.get(
    "/", 
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), 
    getTimetables
);

// POST /api/v1/timetables
router.post(
    "/", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(createTimetableSchema), 
    createTimetable
);

// GET /api/v1/timetables/:id (Admin + Teacher can view)
router.get(
    "/:id", 
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), 
    validate(timetableIdParamsSchema), 
    getTimetableById
);

// PATCH /api/v1/timetables/:id/status
router.patch(
    "/:id/status", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(updateTimetableStatusSchema), 
    updateTimetableStatus
);

// DELETE /api/v1/timetables/:id
router.delete(
    "/:id", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(timetableIdParamsSchema), 
    deleteTimetable
);

// --- Teacher Schedule ---

// GET /api/v1/timetables/teacher-schedule/:teacherId
router.get(
    "/teacher-schedule/:teacherId",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    getTeacherSchedule
);

// --- Entries ---

// POST /api/v1/timetables/:id/entries (Single Entry)
router.post(
    "/:id/entries",
    checkRole([USER_ROLES.ADMIN]),
    validate(createEntrySchema),
    addEntry
);

// POST /api/v1/timetables/:id/entries/sync (Bulk Sync)
router.post(
    "/:id/entries/sync", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(createBulkEntriesSchema), 
    syncTimetableEntries
);

// PATCH /api/v1/timetables/entries/:entryId (Admin + Teacher can edit)
router.patch(
    "/entries/:entryId", 
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), 
    validate(updateEntrySchema), 
    updateEntry
);

// DELETE /api/v1/timetables/entries/:entryId (Clear Single)
router.delete(
    "/entries/:entryId", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(entryIdParamsSchema), 
    deleteEntry
);

export default router;

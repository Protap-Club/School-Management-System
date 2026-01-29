import express from "express";
import {
    createTimetable,
    getTimetables,
    getTimetableById,
    updateTimetableStatus,
    deleteTimetable,
    syncTimetableEntries,
    updateEntry,
    deleteEntry
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
    createBulkEntriesSchema, // renamed to sync in implementation? Or check validation naming?
    updateEntrySchema,
    entryIdParamsSchema
} from "../validations/timetable.validation.js";

const router = express.Router();

router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature('timetable'));

// --- Management ---

// GET /api/v1/timetables
router.get(
    "/", 
    checkRole([USER_ROLES.ADMIN]), 
    getTimetables
);

// POST /api/v1/timetables
router.post(
    "/", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(createTimetableSchema), 
    createTimetable
);

// GET /api/v1/timetables/:id
router.get(
    "/:id", 
    checkRole([USER_ROLES.ADMIN]), 
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

// --- Entries ---

// POST /api/v1/timetables/:id/entries/sync (Bulk Sync)
router.post(
    "/:id/entries/sync", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(createBulkEntriesSchema), 
    syncTimetableEntries
);

// PATCH /api/v1/timetables/entries/:entryId (Update Single)
// Note: User specified /api/v1/timetables/entries/:entryId
// But express router mounted at /timetables. So path is /entries/:entryId
router.patch(
    "/entries/:entryId", 
    checkRole([USER_ROLES.ADMIN]), 
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

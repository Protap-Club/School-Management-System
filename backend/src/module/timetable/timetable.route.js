import express from "express";
import {
    createTimetable,
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
} from "./timetable.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
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

router.use(extractSchoolId);
router.use(requireFeature("timetable"));

// Time Slots (bell schedule)
router.get("/slots", getTimeSlots);
router.post("/slots", checkRole([USER_ROLES.ADMIN]), validate(createTimeSlotSchema), createTimeSlot);
router.put("/slots/:id", checkRole([USER_ROLES.ADMIN]), validate(updateTimeSlotSchema), updateTimeSlot);
router.delete("/slots/:id", checkRole([USER_ROLES.ADMIN]), validate(timeSlotIdParamsSchema), deleteTimeSlot);

// Schedule views
router.get("/schedule/me", checkRole([USER_ROLES.TEACHER, USER_ROLES.STUDENT]), getMyTimetable);
router.get("/schedule/:teacherId", checkRole([USER_ROLES.ADMIN]), validate(teacherScheduleParamsSchema), getTeacherSchedule);

// Timetable entries (individual periods)
router.post("/:id/entries", checkRole([USER_ROLES.ADMIN]), validate(createEntrySchema), addEntry);
router.patch("/entries/:entryId", checkRole([USER_ROLES.ADMIN]), validate(updateEntrySchema), updateEntry);
router.delete("/entries/:entryId", checkRole([USER_ROLES.ADMIN]), validate(entryIdParamsSchema), deleteEntry);

// Timetable CRUD
router.post("/", checkRole([USER_ROLES.ADMIN]), validate(createTimetableSchema), createTimetable);
router.get("/:id", validate(timetableIdParamsSchema), getTimetableById);
router.delete("/:id", checkRole([USER_ROLES.ADMIN]), validate(timetableIdParamsSchema), deleteTimetable);

export default router;

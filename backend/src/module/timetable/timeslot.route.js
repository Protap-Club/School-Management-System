import express from "express";
import {
    createTimeSlot,
    getTimeSlots,
    updateTimeSlot,
    deleteTimeSlot
} from "../controllers/timetable.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createTimeSlotSchema,
    updateTimeSlotSchema,
    timeSlotIdParamsSchema
} from "../../validations/timetable.validation.js";

const router = express.Router();

router.use(checkAuth);
router.use(extractSchoolId);
router.use(requireFeature('timetable'));

// GET /api/v1/timeslots - List all bell slots
router.get(
    "/", 
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), 
    getTimeSlots
);

// POST /api/v1/timeslots - Create a new time slot
router.post(
    "/", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(createTimeSlotSchema), 
    createTimeSlot
);

// PUT /api/v1/timeslots/:id - Update a slot
router.put(
    "/:id", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(updateTimeSlotSchema), 
    updateTimeSlot
);

// DELETE /api/v1/timeslots/:id - Remove a slot
router.delete(
    "/:id", 
    checkRole([USER_ROLES.ADMIN]), 
    validate(timeSlotIdParamsSchema), 
    deleteTimeSlot
);

export default router;

import express from "express";
import { createEvent, getEvents, getEventById, updateEvent, deleteEvent, deleteEventsByDate } from "./calendar.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createEventSchema, updateEventSchema, eventIdParamsSchema, getEventsQuerySchema, deleteByDateSchema } from "./calendar.validation.js";

const router = express.Router();

router.use(requireFeature("calendar"));

router.get("/", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(getEventsQuerySchema), getEvents);
router.post("/", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createEventSchema), createEvent);
router.get("/:id", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(eventIdParamsSchema), getEventById);
router.put("/:id", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(updateEventSchema), updateEvent);
router.delete("/:id", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(eventIdParamsSchema), deleteEvent);
router.delete("/date/:date", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(deleteByDateSchema), deleteEventsByDate);

export default router;


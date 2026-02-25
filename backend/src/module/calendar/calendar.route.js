import express from "express";
import { createEvent, getEvents, getEventById, updateEvent, deleteEvent } from "./calendar.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createEventSchema, updateEventSchema, eventIdParamsSchema, getEventsQuerySchema } from "./calendar.validation.js";

const router = express.Router();

router.get("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(getEventsQuerySchema), getEvents);
router.post("/", checkRole([USER_ROLES.ADMIN]), validate(createEventSchema), createEvent);
router.get("/:id", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(eventIdParamsSchema), getEventById);
router.put("/:id", checkRole([USER_ROLES.ADMIN]), validate(updateEventSchema), updateEvent);
router.delete("/:id", checkRole([USER_ROLES.ADMIN]), validate(eventIdParamsSchema), deleteEvent);

export default router;

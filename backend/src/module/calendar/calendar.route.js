import express from "express";
import { createEvent, getEvents, getEventById, updateEvent, deleteEvent } from "./calendar.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";

const router = express.Router();

router.get("/", getEvents);
router.post("/", checkRole([USER_ROLES.ADMIN]), createEvent);
router.get("/:id", getEventById);
router.put("/:id", checkRole([USER_ROLES.ADMIN]), updateEvent);
router.delete("/:id", checkRole([USER_ROLES.ADMIN]), deleteEvent);

export default router;

import express from "express";
import {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent
} from "./calendar.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// GET /api/v1/calendar - Get all events (all authenticated users)
// POST /api/v1/calendar - Create event (admin only)
router.route("/")
    .get(getEvents)
    .post(checkRole(['admin']), createEvent);

// GET /api/v1/calendar/:id - Get single event
// PUT /api/v1/calendar/:id - Update event (admin only)
// DELETE /api/v1/calendar/:id - Delete event (admin only)
router.route("/:id")
    .get(getEventById)
    .put(checkRole(['admin']), updateEvent)
    .delete(checkRole(['admin']), deleteEvent);

export default router;

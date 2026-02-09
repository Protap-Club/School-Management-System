import logger from "../../config/logger.js";
import {
    createCalendarEvent,
    fetchCalendarEvents,
    getCalendarEventById,
    updateCalendarEvent,
    deleteCalendarEvent
} from "./calendar.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * @desc    Create a new calendar event
 * @route   POST /api/v1/calendar
 * @access  Private (Admin only)
 */
export const createEvent = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const schoolId = req.user.schoolId;

    const result = await createCalendarEvent(req.body, userId, schoolId);

    return res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: result
    });
});

/**
 * @desc    Get all calendar events (with optional date range filter)
 * @route   GET /api/v1/calendar
 * @access  Private
 */
export const getEvents = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const result = await fetchCalendarEvents(req.query, schoolId);

    return res.status(200).json({
        success: true,
        message: "Events fetched successfully",
        count: result.length,
        data: result
    });
});

/**
 * @desc    Get a single calendar event by ID
 * @route   GET /api/v1/calendar/:id
 * @access  Private
 */
export const getEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await getCalendarEventById(id);

    return res.status(200).json({
        success: true,
        message: "Event fetched successfully",
        data: result
    });
});

/**
 * @desc    Update a calendar event
 * @route   PUT /api/v1/calendar/:id
 * @access  Private (Admin only)
 */
export const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await updateCalendarEvent(id, req.body);

    return res.status(200).json({
        success: true,
        message: "Event updated successfully",
        data: result
    });
});

/**
 * @desc    Delete a calendar event
 * @route   DELETE /api/v1/calendar/:id
 * @access  Private (Admin only)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await deleteCalendarEvent(id);

    return res.status(200).json({
        success: true,
        message: "Event deleted successfully"
    });
});

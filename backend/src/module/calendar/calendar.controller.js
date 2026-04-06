import {
    createCalendarEvent,
    fetchCalendarEvents,
    getCalendarEventById,
    updateCalendarEvent,
    deleteCalendarEvent,
    deleteCalendarEventsByDate
} from "./calendar.service.js";
import asyncHandler from "../../utils/asyncHandler.js";


/**
 * Helper: Strip a calendar event down to only what the mobile app needs
 * Students on mobile don't need createdBy, timestamps, etc.
 */
const toMobileEvent = (event) => ({
    _id: event._id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    type: event.type,
    description: event.description || null
});

/**
 * Helper: Check if the request is from the mobile app
 * Reads the 'x-platform' header sent by the mobile client
 */
const isMobilePlatform = (req) => req.headers['x-platform'] === 'mobile';



/**
 * @desc    Create a new calendar event
 * @route   POST /api/v1/calendar
 * @access  Private (Admin only — web only, mobile students have no access)
 */
export const createEvent = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const schoolId = req.user.schoolId;

    const result = await createCalendarEvent(req.body, req.user);

    return res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: result
    });
});

/**
 * @desc    Get all calendar events (with optional date range filter)
 * @route   GET /api/v1/calendar
 * @access  Private (Web: all authenticated | Mobile: students read-only)
 * @query   start, end, type (existing) | upcoming, limit (mobile-friendly)
 */
export const getEvents = asyncHandler(async (req, res) => {
    const result = await fetchCalendarEvents(req.query, req.user);

    // Mobile: return streamlined response for student app
    if (req.platform === "mobile") {
        return res.status(200).json({
            success: true,
            count: result.length,
            data: result.map(toMobileEvent)
        });
    }

    // Web: full response (unchanged)
    return res.status(200).json({
        success: true,
        count: result.length,
        data: result
    });
});

/**
 * @desc    Get a single calendar event by ID
 * @route   GET /api/v1/calendar/:id
 * @access  Private (Web: all authenticated | Mobile: students read-only)
 */
export const getEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await getCalendarEventById(id, req.user.schoolId);

    // Mobile: return streamlined response
    if (req.platform === "mobile") {
        return res.status(200).json({
            success: true,
            data: toMobileEvent(result)
        });
    }

    // Web: full response (unchanged)
    return res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * @desc    Update a calendar event
 * @route   PUT /api/v1/calendar/:id
 * @access  Private (Admin only — web only)
 */
export const updateEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await updateCalendarEvent(id, req.body, req.user);

    return res.status(200).json({
        success: true,
        message: "Event updated successfully",
        data: result
    });
});

/**
 * @desc    Delete a calendar event
 * @route   DELETE /api/v1/calendar/:id
 * @access  Private (Admin only — web only)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await deleteCalendarEvent(id, req.user);

    return res.status(204).end();
});

/**
 * @desc    Delete a calendar event by date (bulk or single)
 * @route   DELETE /api/v1/calendar/date/:date
 * @access  Private (Admin, Super Admin, Teacher)
 */
export const deleteEventsByDate = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const { eventId } = req.query || {};

    const result = await deleteCalendarEventsByDate(date, req.user, eventId);

    return res.status(200).json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
    });
});

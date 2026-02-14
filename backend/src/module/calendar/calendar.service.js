import { CalendarEvent } from "./calendar.model.js";
import logger from "../../config/logger.js";
import { ConflictError, NotFoundError, BadRequestError } from "../../utils/customError.js";

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (eventData, userId, schoolId) => {
    const { title, start, end, allDay, type, description } = eventData;

    // Edge Case: Check if an exact duplicate event already exists to prevent spam
    const existingEvent = await CalendarEvent.findOne({
        title,
        start: new Date(start),
        end: new Date(end),
        schoolId
    });

    if (existingEvent) {
        logger.warn("Duplicate calendar event already exists");
        throw new ConflictError("Duplicate event already exists");
    }

    const newEvent = await CalendarEvent.create({
        title,
        start: new Date(start),
        end: new Date(end),
        allDay: allDay !== undefined ? allDay : true,
        type: type || 'event',
        description,
        createdBy: userId,
        schoolId
    });

    logger.info(`Calendar event created: ${title}`);
    return newEvent;
};

/**
 * Fetch calendar events with optional date range filter
 */
export const fetchCalendarEvents = async (queryData, schoolId) => {
    const { start, end, type } = queryData;
    let query = {};

    // Filter by school if provided
    if (schoolId) {
        query.schoolId = schoolId;
    }

    // Edge Case: If start/end provided, filter by that range (Optimized for Calendar View)
    if (start && end) {
        query.$or = [
            // Events that start within the range
            { start: { $gte: new Date(start), $lte: new Date(end) } },
            // Events that end within the range
            { end: { $gte: new Date(start), $lte: new Date(end) } },
            // Events that span the entire range
            { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } }
        ];
    }

    // Filter by type if provided
    if (type) {
        query.type = type;
    }

    const events = await CalendarEvent.find(query)
        .sort({ start: 1 })
        .populate('createdBy', 'name email')
        .lean();

    return events;
};

/**
 * Get a single calendar event by ID
 */
export const getCalendarEventById = async (id) => {
    const event = await CalendarEvent.findById(id)
        .populate('createdBy', 'name email')
        .lean();

    if (!event) {
        logger.warn(`Calendar event not found: ${id}`);
        throw new NotFoundError("Event not found");
    }

    return event;
};

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (id, updateData) => {
    // Check if event exists
    const event = await CalendarEvent.findById(id);

    if (!event) {
        logger.warn(`Calendar event not found for update: ${id}`);
        throw new NotFoundError("Event not found");
    }

    // Edge Case: If updating dates, re-validate that Start <= End
    if (updateData.start && updateData.end) {
        if (new Date(updateData.start) > new Date(updateData.end)) {
            logger.warn("End date cannot be before start date");
            throw new BadRequestError("End date cannot be before start date");
        }
    }

    // Convert date strings to Date objects if present
    if (updateData.start) {
        updateData.start = new Date(updateData.start);
    }
    if (updateData.end) {
        updateData.end = new Date(updateData.end);
    }

    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    logger.info(`Calendar event updated: ${id}`);
    return updatedEvent;
};

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (id) => {
    const event = await CalendarEvent.findById(id);

    if (!event) {
        logger.warn(`Calendar event not found for deletion: ${id}`);
        throw new NotFoundError("Event not found");
    }

    await CalendarEvent.findByIdAndDelete(id);
    logger.info(`Calendar event deleted: ${id}`);
    return { message: "Event deleted successfully" };
};

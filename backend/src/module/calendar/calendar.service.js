import { CalendarEvent } from "./calendar.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import logger from "../../config/logger.js";
import { ConflictError, NotFoundError, BadRequestError } from "../../utils/customError.js";
import { USER_ROLES } from "../../constants/userRoles.js";

// Create a new calendar event
export const createCalendarEvent = async (eventData, userId, schoolId) => {
    const { title, start, end, allDay, type, description, targetAudience, targetClasses } = eventData;

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
        targetAudience: targetAudience || 'all',
        targetClasses: targetClasses || [],
        createdBy: userId,
        schoolId
    });

    logger.info(`Calendar event created: ${title}`);
    return newEvent;
};

// Fetch calendar events with optional date range filter
// Supports: start, end, type (web calendar view)
//           upcoming, limit (mobile dashboard widget)
// Receives full `user` object to apply role-based audience filtering
export const fetchCalendarEvents = async (queryData, user) => {
    const { start, end, type, upcoming, limit } = queryData;
    const schoolId = user.schoolId;
    const userRole = user.role;

    let query = { schoolId };

    // ── Role-based audience filter ────────────────────────────────────────────
    if (userRole === USER_ROLES.STUDENT) {
        // Look up the student's class assignment
        const profile = await StudentProfile.findOne({ schoolId, userId: user._id })
            .select('standard section')
            .lean();

        if (profile) {
            const classKey = `${profile.standard}-${profile.section}`;
            query.$and = [{
                $or: [
                    { targetAudience: 'all' },
                    { targetClasses: classKey }
                ]
            }];
        } else {
            // Student profile not found — show only school-wide events
            query.targetAudience = 'all';
        }
    } else if (userRole === USER_ROLES.TEACHER) {
        // Look up the teacher's assigned classes
        const profile = await TeacherProfile.findOne({ schoolId, userId: user._id })
            .select('assignedClasses')
            .lean();

        const classStrings = (profile?.assignedClasses || []).map(
            (c) => `${c.standard}-${c.section}`
        );

        query.$and = [{
            $or: [
                { targetAudience: 'all' },
                ...(classStrings.length ? [{ targetClasses: { $in: classStrings } }] : [])
            ]
        }];
    }
    // Admin: no audience filter — sees everything

    // ── Date range filter ────────────────────────────────────────────────────
    if (start && end) {
        const dateFilter = [
            // Events that start within the range
            { start: { $gte: new Date(start), $lte: new Date(end) } },
            // Events that end within the range
            { end: { $gte: new Date(start), $lte: new Date(end) } },
            // Events that span the entire range
            { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } }
        ];
        // Merge with existing $and if present, otherwise use standalone $or
        if (query.$and) {
            query.$and.push({ $or: dateFilter });
        } else {
            query.$or = dateFilter;
        }
    }

    // Mobile-friendly: return only upcoming events (start >= now)
    if (upcoming === 'true' || upcoming === true) {
        query.start = { ...(query.start || {}), $gte: new Date() };
    }

    // Filter by type if provided
    if (type) {
        query.type = type;
    }

    // Parse limit (mobile sends ?limit=3 for dashboard widget)
    const parsedLimit = limit ? parseInt(limit, 10) : 0;

    const events = await CalendarEvent.find(query)
        .sort({ start: 1 })
        .populate('createdBy', 'name email')
        .limit(parsedLimit)   // 0 = no limit (web default)
        .lean();

    // ── Sunday exclusion ─────────────────────────────────────────────────────
    // Single-day events that land exactly on Sunday are excluded.
    // Multi-day events that merely span a Sunday are kept.
    return events.filter((e) => {
        const startDate = new Date(e.start);
        const endDate = new Date(e.end);
        const isSameDay = startDate.toDateString() === endDate.toDateString();
        return !(isSameDay && startDate.getDay() === 0);
    });
};

// Get a single calendar event by ID
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

// Update a calendar event
export const updateCalendarEvent = async (id, updateData) => {
    // Check if event exists
    const event = await CalendarEvent.findById(id);

    if (!event) {
        logger.warn(`Calendar event not found for update: ${id}`);
        throw new NotFoundError("Event not found");
    }

    // Merge new dates with existing ones to validate range correctly
    const newStart = updateData.start ? new Date(updateData.start) : event.start;
    const newEnd = updateData.end ? new Date(updateData.end) : event.end;

    // Validate that Start <= End
    if (newStart > newEnd) {
        logger.warn("End date cannot be before start date");
        throw new BadRequestError("End date cannot be before start date");
    }

    // Convert date strings to Date objects if present (for mongoose update)
    if (updateData.start) updateData.start = newStart;
    if (updateData.end) updateData.end = newEnd;

    const updatedEvent = await CalendarEvent.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    logger.info(`Calendar event updated: ${id}`);
    return updatedEvent;
};

// Delete a calendar event
export const deleteCalendarEvent = async (id) => {
    const deletedEvent = await CalendarEvent.findByIdAndDelete(id);

    if (!deletedEvent) {
        logger.warn(`Calendar event not found for deletion: ${id}`);
        throw new NotFoundError("Event not found");
    }

    logger.info(`Calendar event deleted: ${id}`);
    return { message: "Event deleted successfully" };
};

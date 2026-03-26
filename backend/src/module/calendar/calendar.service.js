import { CalendarEvent } from "./calendar.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import logger from "../../config/logger.js";
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from "../../utils/customError.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { assertClassSectionListExists } from "../../utils/classSection.util.js";

const parseClassKey = (value) => {
    const raw = String(value || "").trim();
    const sepIndex = raw.lastIndexOf("-");
    if (sepIndex <= 0 || sepIndex >= raw.length - 1) return null;

    const standard = raw.slice(0, sepIndex).trim();
    const section = raw.slice(sepIndex + 1).trim().toUpperCase();
    if (!standard || !section) return null;

    return { standard, section, key: `${standard}-${section}` };
};

const normalizeTargetClasses = (targetClasses = []) => {
    if (!Array.isArray(targetClasses)) {
        throw new BadRequestError("targetClasses must be an array");
    }

    const parsed = targetClasses.map(parseClassKey);
    const invalid = parsed
        .map((item, idx) => (!item ? targetClasses[idx] : null))
        .filter(Boolean);

    if (invalid.length) {
        throw new BadRequestError("Invalid class format. Use '<standard>-<section>' (e.g., '10-A').");
    }

    const uniqueKeys = Array.from(new Set(parsed.map((item) => item.key)));
    return {
        normalizedKeys: uniqueKeys,
        parsedPairs: parsed,
    };
};

// Helper: Enforce teacher scope for writing calendar events
const enforceTeacherScope = async (user, targetClasses) => {
    if (user.role !== USER_ROLES.TEACHER) return;

    const profile = await TeacherProfile.findOne({ schoolId: user.schoolId, userId: user._id })
        .select('assignedClasses').lean();
    
    const allowed = (profile?.assignedClasses || []).map(c => `${String(c.standard).trim()}-${String(c.section).trim().toUpperCase()}`);
    const normalizedRequested = (targetClasses || [])
        .map((cls) => parseClassKey(cls)?.key || String(cls).trim());
    const unauthorized = normalizedRequested.filter(c => !allowed.includes(c));
    
    if (unauthorized.length) {
        throw new ForbiddenError(`Not authorized for classes: ${unauthorized.join(', ')}`);
    }
};

const validateTargetClasses = async (schoolId, targetClasses = [], { requireNonEmpty = false } = {}) => {
    const { normalizedKeys, parsedPairs } = normalizeTargetClasses(targetClasses);

    if (requireNonEmpty && normalizedKeys.length === 0) {
        throw new BadRequestError("At least one class is required when audience is set to specific classes");
    }
    if (normalizedKeys.length === 0) return [];

    const validatedPairs = await assertClassSectionListExists(
        schoolId,
        parsedPairs.map(({ standard, section }) => ({ standard, section })),
        {
            requireNonEmpty,
            message: `Invalid class/section: ${normalizedKeys.join(", ")}`,
        }
    );

    return validatedPairs.map((item) => `${item.standard}-${item.section}`);
};

// Create a new calendar event
export const createCalendarEvent = async (eventData, user) => {
    const { title, start, end, allDay, type, description, targetAudience, targetClasses } = eventData;
    const schoolId = user.schoolId;
    const audience = user.role === USER_ROLES.TEACHER ? 'classes' : (targetAudience || 'all');
    const normalizedTargetClasses = audience === 'classes'
        ? await validateTargetClasses(schoolId, targetClasses, { requireNonEmpty: true })
        : [];

    if (user.role === USER_ROLES.TEACHER) {
        if (targetAudience === 'all') {
            throw new ForbiddenError("Teachers cannot create school-wide events");
        }
        await enforceTeacherScope(user, normalizedTargetClasses);
    }

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
        targetAudience: audience,
        targetClasses: normalizedTargetClasses,
        createdBy: user._id,
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
                    { targetAudience: { $exists: false } },
                    { targetAudience: null },
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
                { targetAudience: { $exists: false } },
                { targetAudience: null },
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
export const getCalendarEventById = async (id, schoolId) => {
    const event = await CalendarEvent.findOne({ _id: id, schoolId })
        .populate('createdBy', 'name email')
        .lean();

    if (!event) {
        logger.warn(`Calendar event not found: ${id}`);
        throw new NotFoundError("Event not found");
    }

    return event;
};

// Update a calendar event
export const updateCalendarEvent = async (id, updateData, user) => {
    // Check if event exists
    const event = await CalendarEvent.findById(id);

    if (!event) {
        logger.warn(`Calendar event not found for update: ${id}`);
        throw new NotFoundError("Event not found");
    }
    if (event.sourceType === "exam") {
        throw new ForbiddenError("Exam events can only be edited from the Examination module");
    }

    if (user.role === USER_ROLES.TEACHER) {
        // Original event must not be school-wide
        if (event.targetAudience === 'all') {
            throw new ForbiddenError("Teachers cannot edit school-wide events");
        }
        
        // New audience cannot be school-wide
        if (updateData.targetAudience === 'all') {
            throw new ForbiddenError("Teachers cannot make events school-wide");
        }
    }
    const nextAudience = updateData.targetAudience ?? event.targetAudience;
    const nextClasses = updateData.targetClasses ?? event.targetClasses ?? [];
    let normalizedNextClasses = [];
    if (nextAudience === 'classes') {
        normalizedNextClasses = await validateTargetClasses(event.schoolId, nextClasses, { requireNonEmpty: true });
        if (user.role === USER_ROLES.TEACHER) {
            await enforceTeacherScope(user, normalizedNextClasses);
        }
        updateData.targetClasses = normalizedNextClasses;
    } else if (updateData.targetAudience === 'all') {
        updateData.targetClasses = [];
    }
    if (user.role === USER_ROLES.TEACHER && event.targetAudience === 'classes' && !updateData.targetClasses) {
        await enforceTeacherScope(user, event.targetClasses);
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
export const deleteCalendarEvent = async (id, user) => {
    const event = await CalendarEvent.findById(id);

    if (!event) {
        logger.warn(`Calendar event not found for deletion: ${id}`);
        throw new NotFoundError("Event not found");
    }
    if (event.sourceType === "exam") {
        throw new ForbiddenError("Exam events can only be deleted from the Examination module");
    }

    if (user.role === USER_ROLES.TEACHER) {
        if (event.targetAudience === 'all') {
            throw new ForbiddenError("Teachers cannot delete school-wide events");
        }
        await enforceTeacherScope(user, event.targetClasses);
    }

    await CalendarEvent.findByIdAndDelete(id);

    logger.info(`Calendar event deleted: ${id}`);
    return { message: "Event deleted successfully" };
};

// Delete events by date
export const deleteCalendarEventsByDate = async (dateStr, user, eventId) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new BadRequestError("Invalid date provided");
    }
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // If a specific eventId is provided, delete just that one event
    if (eventId) {
        const event = await CalendarEvent.findById(eventId);
        if (!event) throw new NotFoundError("Event not found");
        if (event.sourceType === "exam") {
            throw new ForbiddenError("Exam events can only be deleted from the Examination module");
        }
        
        if (user.role === USER_ROLES.TEACHER) {
            if (event.targetAudience === 'all') {
                throw new ForbiddenError("Teachers cannot delete school-wide events");
            }
            await enforceTeacherScope(user, event.targetClasses);
        }
        
        await CalendarEvent.findByIdAndDelete(eventId);
        return { message: "Event deleted successfully", deletedCount: 1 };
    }

    // Otherwise: delete all events on that date for the school
    let query = {
        schoolId: user.schoolId,
        start: { $gte: startOfDay, $lte: endOfDay },
        sourceType: { $ne: "exam" }
    };

    // Teachers can only bulk-delete events for their assigned classes
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne(
            { schoolId: user.schoolId, userId: user._id }
        ).select('assignedClasses').lean();
        
        const classKeys = (profile?.assignedClasses || []).map(c => `${c.standard}-${c.section}`);
        if (!classKeys.length) {
             throw new ForbiddenError("No assigned classes for this teacher. Cannot delete events.");
        }
        query.targetClasses = { $in: classKeys };
        query.targetAudience = 'classes';
    }

    const result = await CalendarEvent.deleteMany(query);
    return { message: `${result.deletedCount} event(s) deleted`, deletedCount: result.deletedCount };
};

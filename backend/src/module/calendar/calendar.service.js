import { CalendarEvent } from "./calendar.model.js";
import Exam from "../examination/Exam.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import logger from "../../config/logger.js";
import { ConflictError, NotFoundError, BadRequestError, ForbiddenError } from "../../utils/customError.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { assertClassSectionListExists } from "../../utils/classSection.util.js";
import { createAuditLog } from "../audit/audit.service.js";
import { AUDIT_ACTIONS } from "../../constants/auditActions.js";

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
        .select('classTeacherOf')
        .lean();

    const classTeacherOf = profile?.classTeacherOf;
    const allowed = classTeacherOf?.standard && classTeacherOf?.section
        ? [`${String(classTeacherOf.standard).trim()}-${String(classTeacherOf.section).trim().toUpperCase()}`]
        : [];

    if (!allowed.length) {
        throw new ForbiddenError("You are not assigned as class teacher to any class");
    }

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

const buildExamScopeClauses = (classKeys = []) =>
    (Array.isArray(classKeys) ? classKeys : [])
        .map((classKey) => {
            const parsed = parseClassKey(classKey);
            if (!parsed) return null;

            return {
                standard: parsed.standard,
                section: parsed.section,
            };
        })
        .filter(Boolean);

const buildDateTime = (dateValue, timeValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    if (timeValue) {
        const [hours, minutes] = String(timeValue).split(":").map(Number);
        if (Number.isFinite(hours)) {
            date.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
        }
    }

    return date;
};

const matchesDateRange = (startDate, endDate, rangeStart, rangeEnd) => (
    (startDate >= rangeStart && startDate <= rangeEnd) ||
    (endDate >= rangeStart && endDate <= rangeEnd) ||
    (startDate <= rangeStart && endDate >= rangeEnd)
);

const mapExamScheduleToEvent = (exam, item, index = 0) => {
    const start = buildDateTime(item?.examDate, item?.startTime);
    const end = buildDateTime(item?.examDate, item?.endTime || item?.startTime) || start;
    if (!start || !end) {
        return null;
    }

    const classKey = `${exam.standard}-${String(exam.section || "").toUpperCase()}`;

    return {
        _id: `${exam._id}:${item?._id || index}`,
        title: item?.subject || exam.name || "Exam",
        start,
        end,
        allDay: !(item?.startTime && item?.endTime),
        type: "exam",
        description: [
            exam.name ? `Exam: ${exam.name}` : null,
            `Class: ${classKey}`,
            item?.syllabus || exam.description || null,
        ]
            .filter(Boolean)
            .join("\n"),
        targetAudience: "classes",
        targetClasses: [classKey],
        createdBy: exam.createdBy || null,
        schoolId: exam.schoolId,
        sourceType: "exam",
        sourceId: exam._id,
        examStatus: exam.status,
    };
};

const fetchExamEvents = async ({
    schoolId,
    userRole,
    visibleClassKeys,
    start,
    end,
    upcoming,
}) => {
    const examQuery = {
        schoolId,
        isActive: true,
        status: { $in: ["DRAFT", "PUBLISHED"] },
    };

    const isAdminLike = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(userRole);
    if (!isAdminLike) {
        const scopeClauses = buildExamScopeClauses(visibleClassKeys);
        if (scopeClauses.length === 0) {
            return [];
        }
        examQuery.$or = scopeClauses;
    }

    const exams = await Exam.find(examQuery)
        .select("_id schoolId name description standard section status schedule createdBy")
        .populate("createdBy", "name email")
        .lean();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const hasRange = Boolean(start && end);
    const rangeStart = hasRange ? new Date(start) : null;
    const rangeEnd = hasRange ? new Date(end) : null;

    return exams.flatMap((exam) =>
        (Array.isArray(exam.schedule) ? exam.schedule : [])
            .map((item, index) => mapExamScheduleToEvent(exam, item, index))
            .filter(Boolean)
            .filter((event) => {
                if (event.end < now) {
                    return false;
                }

                if ((upcoming === "true" || upcoming === true) && event.start < new Date()) {
                    return false;
                }

                if (!hasRange) {
                    return true;
                }

                return matchesDateRange(event.start, event.end, rangeStart, rangeEnd);
            })
    );
};

// Create a new calendar event
export const createCalendarEvent = async (eventData, user, metadata) => {
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

    createAuditLog({
        schoolId,
        actor: user._id,
        actorModel: user.role === USER_ROLES.SUPER_ADMIN ? "SuperAdmin" : "User",
        action: AUDIT_ACTIONS.CALENDAR.EVENT_CREATED,
        entityId: newEvent._id,
        entityModel: "CalendarEvent",
        status: "success",
        details: {
            title: newEvent.title,
            type: newEvent.type,
            targetAudience: newEvent.targetAudience
        },
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        sessionToken: null
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

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

    let query = { schoolId, sourceType: { $ne: "exam" } };
    let visibleClassKeys = null;

    // ── Role-based audience filter ────────────────────────────────────────────
    if (userRole === USER_ROLES.STUDENT) {
        // Look up the student's class assignment
        const profile = await StudentProfile.findOne({ schoolId, userId: user._id })
            .select('standard section')
            .lean();

        if (profile) {
            const classKey = `${profile.standard}-${profile.section}`;
            visibleClassKeys = [classKey];
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
            visibleClassKeys = [];
            query.targetAudience = 'all';
        }
    } else if (userRole === USER_ROLES.TEACHER) {
        // Teachers should see events for every assigned class, not only their class-teacher class.
        const profile = await TeacherProfile.findOne({ schoolId, userId: user._id })
            .select('classTeacherOf assignedClasses')
            .lean();

        const classStrings = Array.from(
            new Set(
                [
                    ...(Array.isArray(profile?.assignedClasses) ? profile.assignedClasses : []),
                    ...(profile?.classTeacherOf?.standard && profile?.classTeacherOf?.section
                        ? [profile.classTeacherOf]
                        : []),
                ]
                    .map((item) => {
                        const standard = String(item?.standard || "").trim();
                        const section = String(item?.section || "").trim().toUpperCase();
                        return standard && section ? `${standard}-${section}` : null;
                    })
                    .filter(Boolean)
            )
        );
        visibleClassKeys = classStrings;

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

    const calendarEvents = await CalendarEvent.find(query)
        .sort({ start: 1 })
        .populate('createdBy', 'name email')
        .lean();

    const examEvents = type && type !== "exam"
        ? []
        : await fetchExamEvents({
            schoolId,
            userRole,
            visibleClassKeys,
            start,
            end,
            upcoming,
        });

    const events = [...calendarEvents, ...examEvents]
        .sort((left, right) => new Date(left.start) - new Date(right.start));

    const limitedEvents = parsedLimit > 0 ? events.slice(0, parsedLimit) : events;

    // ── Sunday exclusion & Past Exam Filtering ──────────────────────────────
    // 1. Single-day events that land exactly on Sunday are excluded.
    // 2. Exams that have already passed their end date are excluded (as requested).
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return limitedEvents.filter((e) => {
        const startDate = new Date(e.start);
        const endDate = new Date(e.end);
        
        // Automatic removal of past exams from the calendar view (as requested)
        if (e.type === "exam" && endDate < now) {
            return false;
        }

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
export const updateCalendarEvent = async (id, updateData, user, metadata) => {
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

    createAuditLog({
        schoolId: event.schoolId,
        actor: user._id,
        actorModel: user.role === USER_ROLES.SUPER_ADMIN ? "SuperAdmin" : "User",
        action: AUDIT_ACTIONS.CALENDAR.EVENT_UPDATED,
        entityId: updatedEvent._id,
        entityModel: "CalendarEvent",
        status: "success",
        details: { fields: Object.keys(updateData) },
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        sessionToken: null
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return updatedEvent;
};

// Delete a calendar event
export const deleteCalendarEvent = async (id, user, metadata) => {
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

    createAuditLog({
        schoolId: event.schoolId,
        actor: user._id,
        actorModel: user.role === USER_ROLES.SUPER_ADMIN ? "SuperAdmin" : "User",
        action: AUDIT_ACTIONS.CALENDAR.EVENT_DELETED,
        entityId: id,
        entityModel: "CalendarEvent",
        status: "success",
        details: { title: event.title },
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        sessionToken: null
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return { message: "Event deleted successfully" };
};

// Delete events by date
export const deleteCalendarEventsByDate = async (dateStr, user, eventId, metadata) => {
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

        createAuditLog({
            schoolId: event.schoolId,
            actor: user._id,
            actorModel: user.role === USER_ROLES.SUPER_ADMIN ? "SuperAdmin" : "User",
            action: AUDIT_ACTIONS.CALENDAR.EVENT_DELETED,
            entityId: eventId,
            entityModel: "CalendarEvent",
            status: "success",
            details: { title: event.title, deletedByDate: true },
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
            sessionToken: null
        }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

        return { message: "Event deleted successfully", deletedCount: 1 };
    }

    // Otherwise: delete all events on that date for the school
    let query = {
        schoolId: user.schoolId,
        start: { $gte: startOfDay, $lte: endOfDay },
        sourceType: { $ne: "exam" }
    };

    // Teachers can only bulk-delete events for their class-teacher class
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne(
            { schoolId: user.schoolId, userId: user._id }
        ).select('classTeacherOf').lean();

        const classTeacherOf = profile?.classTeacherOf;
        const classKeys = classTeacherOf?.standard && classTeacherOf?.section
            ? [`${String(classTeacherOf.standard).trim()}-${String(classTeacherOf.section).trim().toUpperCase()}`]
            : [];
        if (!classKeys.length) {
            throw new ForbiddenError("You are not assigned as class teacher to any class. Cannot delete events.");
        }
        query.targetClasses = { $in: classKeys };
        query.targetAudience = 'classes';
    }

    const result = await CalendarEvent.deleteMany(query);

    createAuditLog({
        schoolId: user.schoolId,
        actor: user._id,
        actorModel: user.role === USER_ROLES.SUPER_ADMIN ? "SuperAdmin" : "User",
        action: AUDIT_ACTIONS.CALENDAR.EVENT_DELETED,
        entityId: null, // Bulk
        entityModel: "CalendarEvent",
        status: "success",
        details: { deletedCount: result.deletedCount, date: dateStr },
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        sessionToken: null
    }).catch(err => logger.error(`Failed to create audit log: ${err.message}`));

    return { message: `${result.deletedCount} event(s) deleted`, deletedCount: result.deletedCount };
};

import { ProxyRequest, ProxyAssignment } from "./Proxy.model.js";
import { Timetable, TimetableEntry, TimeSlot } from "../timetable/Timetable.model.js";
import User from "../user/model/User.model.js";
import { NotFoundError, ConflictError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import * as noticeService from "../notice/notice.service.js";

/**
 * Get day of week string from date
 */
const getDayOfWeek = (date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
};

const normalizeStartOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const normalizeEndOfDay = (value) => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const parseDateInput = (value, label) => {
    const normalizedValue =
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? `${value}T00:00:00`
            : value;
    const parsed = new Date(normalizedValue);
    if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestError(`Invalid ${label} format`);
    }
    return parsed;
};

const resolveDateRangeFilters = (filters = {}) => {
    const { date, fromDate, toDate, datePreset } = filters;

    // Backward-compatible single-day filter.
    if (date) {
        const parsedDate = parseDateInput(date, "date");
        return {
            start: normalizeStartOfDay(parsedDate),
            end: normalizeEndOfDay(parsedDate),
        };
    }

    const preset = (datePreset || "").trim().toLowerCase();
    const todayStart = normalizeStartOfDay(new Date());
    const todayEnd = normalizeEndOfDay(new Date());

    if (preset === "today") {
        return { start: todayStart, end: todayEnd };
    }

    if (preset === "last7") {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 6);
        return { start, end: todayEnd };
    }

    if (preset === "last30") {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return { start, end: todayEnd };
    }

    if (preset && !["all", "custom"].includes(preset)) {
        throw new BadRequestError("Invalid datePreset. Allowed values: all, today, last7, last30, custom");
    }

    const hasCustomRange = Boolean(fromDate) || Boolean(toDate) || preset === "custom";
    if (!hasCustomRange) {
        return { start: null, end: null };
    }

    const start = fromDate ? normalizeStartOfDay(parseDateInput(fromDate, "fromDate")) : null;
    const end = toDate ? normalizeEndOfDay(parseDateInput(toDate, "toDate")) : null;

    if (start && end && start > end) {
        throw new BadRequestError("fromDate cannot be after toDate");
    }

    return { start, end };
};

/**
 * Check if a teacher is available for a given slot
 * A teacher is NOT available if:
 * 1. They have a class in the weekly timetable at that day + period
 * 2. They are already assigned as a proxy for that date + period
 */
export const checkTeacherAvailability = async (schoolId, teacherId, date, dayOfWeek, timeSlotId) => {
    // 1. Check weekly timetable - does teacher have a regular class at this slot?
    const timetableEntry = await TimetableEntry.findOne({
        schoolId,
        teacherId,
        dayOfWeek,
        timeSlotId
    }).lean();

    if (timetableEntry) {
        return {
            available: false,
            reason: "Teacher has regular class at this time slot"
        };
    }

    // 2. Check proxy assignments - is teacher already assigned as proxy for this date + slot?
    const proxyAssignment = await ProxyAssignment.findOne({
        schoolId,
        proxyTeacherId: teacherId,
        date,
        timeSlotId,
        isActive: true
    }).lean();

    if (proxyAssignment) {
        return {
            available: false,
            reason: "Teacher is already assigned as proxy for another class at this time"
        };
    }

    return { available: true };
};

/**
 * Get list of available teachers for a proxy assignment
 * Returns only teachers who are free for the requested slot.
 */
export const getAvailableTeachersForProxy = async (schoolId, date, dayOfWeek, timeSlotId) => {
    const allTeachers = await User.find({
        schoolId,
        role: USER_ROLES.TEACHER,
        isActive: true,
        isArchived: false
    }).select("_id name email").lean();

    const availabilityResults = await Promise.all(
        allTeachers.map(async (teacher) => {
            const availability = await checkTeacherAvailability(
                schoolId,
                teacher._id,
                date,
                dayOfWeek,
                timeSlotId
            );

            return { teacher, availability };
        })
    );

    return availabilityResults
        .filter(({ availability }) => availability.available)
        .map(({ teacher }) => ({
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Create a proxy request (when teacher marks themselves unavailable)
 */
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const createProxyRequest = async (teacherId, schoolId, data) => {
    const { date, dayOfWeek, timeSlotId, reason } = data;

    // Parse and validate date - normalize to start of day
    const requestDate = new Date(date);
    if (isNaN(requestDate.getTime())) {
        throw new BadRequestError("Invalid date format");
    }
    // Normalize to start of day for consistent comparison
    requestDate.setHours(0, 0, 0, 0);

    // Validate that date matches the dayOfWeek
    const actualDayName = DAYS_OF_WEEK[requestDate.getDay()];
    if (actualDayName !== dayOfWeek) {
        throw new BadRequestError(`Selected date is ${actualDayName}, but this class is scheduled on ${dayOfWeek}. Please select a ${dayOfWeek}.`);
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestDate < today) {
        throw new BadRequestError("Cannot create proxy request for past dates");
    }

    // Get time slot details
    const timeSlot = await TimeSlot.findOne({
        _id: timeSlotId,
        schoolId
    }).lean();

    if (!timeSlot) {
        throw new NotFoundError("Time slot not found");
    }

    // Find the timetable entry for this teacher at this slot
    const timetableEntry = await TimetableEntry.findOne({
        schoolId,
        teacherId,
        dayOfWeek,
        timeSlotId
    }).populate("timetableId", "standard section").lean();

    if (!timetableEntry) {
        throw new NotFoundError("No class scheduled for you at this time slot");
    }

    // Check if a request already exists for this slot (use date range for proper comparison)
    const nextDay = new Date(requestDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingRequest = await ProxyRequest.findOne({
        schoolId,
        teacherId,
        date: { $gte: requestDate, $lt: nextDay },
        dayOfWeek,
        timeSlotId,
        status: { $in: ["pending", "resolved"] }
    }).lean();

    if (existingRequest) {
        throw new ConflictError("A proxy request already exists for this time slot and date");
    }

    // Check if a proxy assignment already exists (admin may have already assigned)
    const existingAssignment = await ProxyAssignment.findOne({
        schoolId,
        originalTeacherId: teacherId,
        date: { $gte: requestDate, $lt: nextDay },
        dayOfWeek,
        timeSlotId,
        isActive: true
    }).lean();

    if (existingAssignment) {
        throw new ConflictError("A proxy assignment already exists for this time slot and date. Contact admin if changes are needed.");
    }

    // Create the proxy request
    const proxyRequest = await ProxyRequest.create({
        schoolId,
        teacherId,
        standard: timetableEntry.timetableId.standard,
        section: timetableEntry.timetableId.section,
        subject: timetableEntry.subject,
        date: requestDate,
        dayOfWeek,
        timeSlotId,
        slotNumber: timeSlot.slotNumber,
        reason,
        status: "pending"
    });

    logger.info(`Proxy request created: ${proxyRequest._id} by teacher ${teacherId} for ${dayOfWeek} slot ${timeSlot.slotNumber}`);

    return proxyRequest;
};

/**
 * Get all proxy requests for a school (admin view)
 */
export const getProxyRequests = async (schoolId, filters = {}) => {
    const { status, teacherId, page = 0, pageSize = 25 } = filters;
    const { start, end } = resolveDateRangeFilters(filters);

    const numericPage = Number.parseInt(page, 10);
    const numericPageSize = Number.parseInt(pageSize, 10);
    const safePage = Number.isNaN(numericPage) ? 0 : Math.max(numericPage, 0);
    const safePageSize = Number.isNaN(numericPageSize) ? 25 : Math.min(Math.max(numericPageSize, 1), 100);

    const query = { schoolId };
    if (status) query.status = status;
    if (teacherId) query.teacherId = teacherId;
    if (start || end) {
        query.date = {};
        if (start) query.date.$gte = start;
        if (end) query.date.$lte = end;
    }

    const statsQuery = { schoolId };
    if (teacherId) statsQuery.teacherId = teacherId;
    if (start || end) {
        statsQuery.date = {};
        if (start) statsQuery.date.$gte = start;
        if (end) statsQuery.date.$lte = end;
    }

    const [totalCount, requests, pendingCount, resolvedRequestsForStats] = await Promise.all([
        ProxyRequest.countDocuments(query),
        ProxyRequest.find(query)
            .populate("teacherId", "name email")
            .populate("timeSlotId", "startTime endTime slotNumber")
            .populate({
                path: "proxyAssignmentId",
                select: "type proxyTeacherId notes",
                populate: {
                    path: "proxyTeacherId",
                    select: "name email"
                }
            })
            .sort({ date: -1, slotNumber: 1 })
            .skip(safePage * safePageSize)
            .limit(safePageSize)
            .lean(),
        ProxyRequest.countDocuments({ ...statsQuery, status: "pending" }),
        ProxyRequest.find({ ...statsQuery, status: "resolved" })
            .populate("proxyAssignmentId", "type")
            .lean()
    ]);

    let assignedProxyCount = 0;
    let freePeriodCount = 0;

    resolvedRequestsForStats.forEach((request) => {
        const assignmentType = request.proxyAssignmentId?.type;
        if (assignmentType === "proxy") assignedProxyCount += 1;
        if (assignmentType === "free_period") freePeriodCount += 1;
    });

    return {
        requests,
        stats: {
            pendingCount,
            assignedProxyCount,
            freePeriodCount
        },
        pagination: {
            page: safePage,
            pageSize: safePageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / safePageSize)
        }
    };
};

/**
 * Get proxy requests for a specific teacher
 */
export const getTeacherProxyRequests = async (teacherId, schoolId, filters = {}) => {
    const { status, date } = filters;

    const query = { schoolId, teacherId };

    if (status) query.status = status;
    if (date) {
        const filterDate = new Date(date);
        const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));
        query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    return await ProxyRequest.find(query)
        .populate("timeSlotId", "startTime endTime slotNumber")
        .populate({
            path: "proxyAssignmentId",
            select: "type proxyTeacherId notes",
            populate: {
                path: "proxyTeacherId",
                select: "name email"
            }
        })
        .sort({ date: -1, slotNumber: 1 })
        .lean();
};

/**
 * Assign a proxy teacher (admin action)
 */
export const assignProxyTeacher = async (adminId, schoolId, requestId, data) => {
    const { proxyTeacherId, notes } = data;

    // Get the proxy request
    const proxyRequest = await ProxyRequest.findOne({
        _id: requestId,
        schoolId,
        status: "pending"
    }).lean();

    if (!proxyRequest) {
        throw new NotFoundError("Proxy request not found or already resolved");
    }

    // Validate the proxy teacher is available
    const availability = await checkTeacherAvailability(
        schoolId,
        proxyTeacherId,
        proxyRequest.date,
        proxyRequest.dayOfWeek,
        proxyRequest.timeSlotId
    );

    if (!availability.available) {
        throw new ConflictError(`Selected teacher is not available: ${availability.reason}`);
    }

    // Create the proxy assignment
    const proxyAssignment = await ProxyAssignment.create({
        schoolId,
        proxyRequestId: requestId,
        originalTeacherId: proxyRequest.teacherId,
        proxyTeacherId,
        type: "proxy",
        standard: proxyRequest.standard,
        section: proxyRequest.section,
        subject: proxyRequest.subject,
        date: proxyRequest.date,
        dayOfWeek: proxyRequest.dayOfWeek,
        timeSlotId: proxyRequest.timeSlotId,
        slotNumber: proxyRequest.slotNumber,
        assignedBy: adminId,
        notes
    });

    // Update the proxy request
    await ProxyRequest.findByIdAndUpdate(requestId, {
        status: "resolved",
        resolvedAt: new Date(),
        proxyAssignmentId: proxyAssignment._id
    });

    // Send notifications to both teachers
    try {
        const proxyTeacher = await User.findById(proxyTeacherId).select("name").lean();
        const dateStr = proxyRequest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Notify original teacher that proxy has been assigned
        await noticeService.createNotice(schoolId, adminId, {
            title: "Proxy Request Resolved",
            message: `Your proxy request for ${proxyRequest.standard}-${proxyRequest.section} (${proxyRequest.subject || 'No subject'}) on ${dateStr} (${proxyRequest.dayOfWeek}) Period #${proxyRequest.slotNumber} has been resolved. ${proxyTeacher?.name || 'A teacher'} has been assigned as your proxy.`,
            recipientType: "users",
            recipients: [proxyRequest.teacherId.toString()]
        });

        // Notify proxy teacher about their new assignment
        await noticeService.createNotice(schoolId, adminId, {
            title: "New Proxy Assignment",
            message: `You have been assigned as a proxy teacher for ${proxyRequest.standard}-${proxyRequest.section} (${proxyRequest.subject || 'No subject'}) on ${dateStr} (${proxyRequest.dayOfWeek}) Period #${proxyRequest.slotNumber}. Please check your schedule.`,
            recipientType: "users",
            recipients: [proxyTeacherId.toString()]
        });
    } catch (notifyError) {
        logger.warn(`Failed to send proxy notifications: ${notifyError.message}`);
        // Don't throw - assignment is still successful
    }

    logger.info(`Proxy assigned: ${proxyAssignment._id} for request ${requestId}`);

    return proxyAssignment;
};

/**
 * Mark a class as free period (admin action)
 */
export const markAsFreePeriod = async (adminId, schoolId, requestId, notes) => {
    // Get the proxy request
    const proxyRequest = await ProxyRequest.findOne({
        _id: requestId,
        schoolId,
        status: "pending"
    }).lean();

    if (!proxyRequest) {
        throw new NotFoundError("Proxy request not found or already resolved");
    }

    // Create the free period assignment
    const proxyAssignment = await ProxyAssignment.create({
        schoolId,
        proxyRequestId: requestId,
        originalTeacherId: proxyRequest.teacherId,
        proxyTeacherId: null,
        type: "free_period",
        standard: proxyRequest.standard,
        section: proxyRequest.section,
        subject: proxyRequest.subject,
        date: proxyRequest.date,
        dayOfWeek: proxyRequest.dayOfWeek,
        timeSlotId: proxyRequest.timeSlotId,
        slotNumber: proxyRequest.slotNumber,
        assignedBy: adminId,
        notes
    });

    // Update the proxy request
    await ProxyRequest.findByIdAndUpdate(requestId, {
        status: "resolved",
        resolvedAt: new Date(),
        proxyAssignmentId: proxyAssignment._id
    });

    // Notify original teacher that class is marked as free period
    try {
        const dateStr = proxyRequest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        await noticeService.createNotice(schoolId, adminId, {
            title: "Proxy Request Resolved - Free Period",
            message: `Your proxy request for ${proxyRequest.standard}-${proxyRequest.section} (${proxyRequest.subject || 'No subject'}) on ${dateStr} (${proxyRequest.dayOfWeek}) Period #${proxyRequest.slotNumber} has been resolved. The class has been marked as a free period.`,
            recipientType: "users",
            recipients: [proxyRequest.teacherId.toString()]
        });
    } catch (notifyError) {
        logger.warn(`Failed to send free period notification: ${notifyError.message}`);
    }

    logger.info(`Free period marked: ${proxyAssignment._id} for request ${requestId}`);

    return proxyAssignment;
};

/**
 * Direct admin assignment (without teacher request)
 */
export const createDirectProxyAssignment = async (adminId, schoolId, data) => {
    const {
        originalTeacherId,
        proxyTeacherId,
        type,
        standard,
        section,
        subject,
        date,
        dayOfWeek,
        timeSlotId,
        notes
    } = data;

    const requestDate = new Date(date);
    if (isNaN(requestDate.getTime())) {
        throw new BadRequestError("Invalid date format");
    }

    // Validate that date matches the dayOfWeek
    const actualDayName = DAYS_OF_WEEK[requestDate.getDay()];
    if (actualDayName !== dayOfWeek) {
        throw new BadRequestError(`Selected date is ${actualDayName}, but this class is scheduled on ${dayOfWeek}. Please select a ${dayOfWeek}.`);
    }

    // Get time slot details
    const timeSlot = await TimeSlot.findOne({
        _id: timeSlotId,
        schoolId
    }).lean();

    if (!timeSlot) {
        throw new NotFoundError("Time slot not found");
    }

    // If assigning a proxy teacher, verify availability
    if (type === "proxy" && proxyTeacherId) {
        const availability = await checkTeacherAvailability(
            schoolId,
            proxyTeacherId,
            requestDate,
            dayOfWeek,
            timeSlotId
        );

        if (!availability.available) {
            throw new ConflictError(`Selected teacher is not available: ${availability.reason}`);
        }
    }

    // Check if an assignment already exists for this slot
    const existingAssignment = await ProxyAssignment.findOne({
        schoolId,
        standard,
        section,
        date: requestDate,
        dayOfWeek,
        timeSlotId,
        isActive: true
    }).lean();

    if (existingAssignment) {
        // Deactivate the old assignment
        await ProxyAssignment.findByIdAndUpdate(existingAssignment._id, { isActive: false });
    }

    // Create the assignment
    const proxyAssignment = await ProxyAssignment.create({
        schoolId,
        proxyRequestId: null, // No request for direct assignments
        originalTeacherId,
        proxyTeacherId: type === "proxy" ? proxyTeacherId : null,
        type,
        standard,
        section,
        subject,
        date: requestDate,
        dayOfWeek,
        timeSlotId,
        slotNumber: timeSlot.slotNumber,
        assignedBy: adminId,
        notes
    });

    logger.info(`Direct proxy assignment created: ${proxyAssignment._id}`);

    return proxyAssignment;
};

/**
 * Get proxy assignments for a specific date (for timetable rendering)
 */
export const getProxyAssignmentsForDate = async (schoolId, date) => {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    return await ProxyAssignment.find({
        schoolId,
        date: { $gte: startOfDay, $lte: endOfDay },
        isActive: true
    })
        .populate("proxyTeacherId", "name email")
        .populate("originalTeacherId", "name email")
        .populate("timeSlotId", "startTime endTime slotNumber")
        .lean();
};

/**
 * Get timetable with proxy overrides applied
 * This is used for rendering the final schedule
 */
export const getTimetableWithProxyOverrides = async (schoolId, standard, section, date) => {
    const dayOfWeek = getDayOfWeek(new Date(date));

    // Get the base timetable
    const timetable = await Timetable.findOne({
        schoolId,
        standard,
        section
    }).lean();

    if (!timetable) {
        throw new NotFoundError("Timetable not found for this class");
    }

    // Get all entries for this timetable on the specific day
    const entries = await TimetableEntry.find({
        timetableId: timetable._id,
        dayOfWeek
    })
        .populate("teacherId", "name email")
        .populate("timeSlotId", "startTime endTime slotNumber slotType")
        .lean();

    // Get proxy assignments for this date
    const proxyAssignments = await getProxyAssignmentsForDate(schoolId, date);

    // Create a map for quick lookup
    const proxyMap = new Map();
    proxyAssignments.forEach(assignment => {
        const assignmentSlotId = assignment.timeSlotId?._id || assignment.timeSlotId;
        const key = `${assignment.dayOfWeek}_${assignmentSlotId}`;
        proxyMap.set(key, assignment);
    });

    // Apply proxy overrides to entries
    const finalEntries = entries.map(entry => {
        const entrySlotId = entry.timeSlotId?._id || entry.timeSlotId;
        const key = `${entry.dayOfWeek}_${entrySlotId}`;
        const proxyAssignment = proxyMap.get(key);

        if (proxyAssignment) {
            return {
                ...entry,
                isProxyOverride: true,
                proxyAssignmentId: proxyAssignment._id,
                originalTeacher: entry.teacherId,
                teacherId: proxyAssignment.type === "proxy" ? proxyAssignment.proxyTeacherId : null,
                proxyType: proxyAssignment.type, // "proxy" or "free_period"
                proxyNotes: proxyAssignment.notes
            };
        }

        return entry;
    });

    return {
        timetable,
        entries: finalEntries,
        proxyAssignments
    };
};

/**
 * Cancel a proxy request (teacher can cancel their own pending request)
 */
export const cancelProxyRequest = async (teacherId, schoolId, requestId) => {
    const proxyRequest = await ProxyRequest.findOne({
        _id: requestId,
        schoolId,
        teacherId,
        status: "pending"
    });

    if (!proxyRequest) {
        throw new NotFoundError("Proxy request not found or cannot be cancelled");
    }

    proxyRequest.status = "cancelled";
    await proxyRequest.save();

    logger.info(`Proxy request cancelled: ${requestId}`);

    return proxyRequest;
};

/**
 * Get teacher's schedule for a date (with proxy information)
 */
export const getTeacherScheduleWithProxies = async (schoolId, teacherId, date) => {
    const targetDate = new Date(date);
    const dayOfWeek = getDayOfWeek(targetDate);

    // Get regular timetable entries for this teacher
    const regularEntries = await TimetableEntry.find({
        schoolId,
        teacherId,
        dayOfWeek
    })
        .populate("timetableId", "standard section")
        .populate("timeSlotId", "startTime endTime slotNumber slotType")
        .lean();

    // Get proxy assignments where this teacher is the proxy
    const proxyAssignments = await ProxyAssignment.find({
        schoolId,
        proxyTeacherId: teacherId,
        date: targetDate,
        isActive: true
    })
        .populate("originalTeacherId", "name email")
        .populate("timeSlotId", "startTime endTime slotNumber slotType")
        .lean();

    // Get proxy requests for this teacher on this date
    const proxyRequests = await ProxyRequest.find({
        schoolId,
        teacherId,
        date: targetDate
    }).lean();

    // Combine and format the schedule
    const schedule = {
        regularClasses: regularEntries.map(entry => ({
            ...entry,
            type: "regular",
            standard: entry.timetableId.standard,
            section: entry.timetableId.section
        })),
        proxyAssignments: proxyAssignments.map(assignment => ({
            ...assignment,
            type: assignment.type || "proxy" // Use actual type: "proxy" or "free_period"
        })),
        proxyRequests: proxyRequests
    };

    return schedule;
};

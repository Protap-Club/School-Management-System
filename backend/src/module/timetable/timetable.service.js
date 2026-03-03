import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "./Timetable.model.js";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import StudentProfile from "../user/model/StudentProfile.model.js";

// TIMESLOT SERVICES

// Fetches all bell schedule time slots for a specific school
export const getTimeSlots = async (schoolId) => {
    return await TimeSlot.find({ schoolId }).sort({ slotNumber: 1 }).lean();
};

// Creates a new time slot ensuring no duplicate slot numbers exist
export const createTimeSlot = async (schoolId, data) => {
    const exists = await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber });
    if (exists) throw new ConflictError(`Slot #${data.slotNumber} already exists`);

    const slot = await TimeSlot.create({ schoolId, ...data });
    logger.info(`TimeSlot created: ${slot._id}`);
    return slot;
};

// Updates an existing time slot and validates slot number uniqueness
export const updateTimeSlot = async (schoolId, id, data) => {
    // Check if new slot number conflicts
    if (data.slotNumber) {
        const exists = await TimeSlot.exists({
            schoolId,
            slotNumber: data.slotNumber,
            _id: { $ne: id }
        });
        if (exists) throw new ConflictError(`Slot #${data.slotNumber} already exists`);
    }

    const slot = await TimeSlot.findOneAndUpdate(
        { _id: id, schoolId },
        data,
        { new: true }
    );

    if (!slot) throw new NotFoundError("TimeSlot not found");
    logger.info(`TimeSlot updated: ${id}`);
    return slot;
};

// Deletes a time slot if it is not currently linked to any timetable entries
export const deleteTimeSlot = async (schoolId, id) => {
    // Check if slot is in use
    const inUse = await TimetableEntry.exists({ timeSlotId: id });
    if (inUse) throw new ConflictError("TimeSlot is currently in use");

    const slot = await TimeSlot.findOneAndDelete({ _id: id, schoolId });
    if (!slot) throw new NotFoundError("TimeSlot not found");
    logger.info(`TimeSlot deleted: ${id}`);
};

// TIMETABLE SERVICES

// Retrieves all timetable headers for a specific school with optional filters
export const getTimetables = async (schoolId, filters = {}) => {
    const query = { schoolId };
    if (filters.standard) query.standard = filters.standard;
    if (filters.section) query.section = filters.section;
    if (filters.academicYear) query.academicYear = filters.academicYear;

    return await Timetable.find(query).sort({ academicYear: -1, standard: 1, section: 1 }).lean();
};

// Retrieves a full timetable by ID including all populated entry details
export const getTimetableById = async (schoolId, id) => {
    const timetable = await Timetable.findOne({ _id: id, schoolId }).lean();
    if (!timetable) throw new NotFoundError("Timetable not found");

    const entries = await TimetableEntry.find({ timetableId: id })
        .populate("timeSlotId", "slotNumber startTime endTime")
        .populate("teacherId", "name")
        .sort({ dayOfWeek: 1 })
        .lean();

    return { timetable, entries };
};

// Initializes a new timetable header for a specific class and academic year
export const createTimetable = async (schoolId, data) => {
    const exists = await Timetable.exists({
        schoolId,
        standard: data.standard,
        section: data.section,
        academicYear: data.academicYear
    });

    if (exists) throw new ConflictError("Timetable already exists for this class");

    const timetable = await Timetable.create({ schoolId, ...data });
    logger.info(`Timetable created: ${timetable._id}`);
    return timetable;
};

// Permanently removes a timetable and all associated schedule entries
export const deleteTimetable = async (schoolId, id) => {
    const timetable = await Timetable.findOne({ _id: id, schoolId });
    if (!timetable) throw new NotFoundError("Timetable not found");

    await TimetableEntry.deleteMany({ timetableId: id });
    await Timetable.deleteOne({ _id: id, schoolId });
    logger.info(`Timetable deleted: ${id}`);
};

// ENTRY SERVICES
// Bulk creates multiple schedule entries while checking for teacher availability conflicts
export const createEntries = async (schoolId, timetableId, entries) => {
    const timetable = await Timetable.findOne({ _id: timetableId, schoolId });
    if (!timetable) throw new NotFoundError("Timetable not found");

    const created = [];
    const failed = [];

    for (const entry of entries) {
        try {
            // Skip if no teacher (break periods)
            if (!entry.teacherId) {
                const newEntry = await TimetableEntry.create({
                    schoolId,
                    timetableId,
                    ...entry
                });
                created.push(newEntry);
                continue;
            }

            // Check teacher conflict
            const conflict = await TimetableEntry.findOne({
                schoolId,
                teacherId: entry.teacherId,
                dayOfWeek: entry.dayOfWeek,
                timeSlotId: entry.timeSlotId
            }).populate('timetableId');

            if (conflict) {
                failed.push({
                    ...entry,
                    reason: `Teacher busy in ${conflict.timetableId.standard}-${conflict.timetableId.section}`
                });
                continue;
            }

            // Create entry
            const newEntry = await TimetableEntry.create({
                schoolId,
                timetableId,
                ...entry
            });
            created.push(newEntry);

        } catch (error) {
            failed.push({ ...entry, reason: error.message });
        }
    }

    logger.info(`Entries created: ${created.length}, failed: ${failed.length}`);
    return { created: created.length, failed };
};

// Updates a single schedule entry with role-based access control and conflict checks
export const updateEntry = async (schoolId, id, updates, userId, userRole) => {
    const entry = await TimetableEntry.findOne({ _id: id, schoolId }).lean();
    if (!entry) throw new NotFoundError("Entry not found");

    // Teachers can only edit timetables they're assigned to
    if (userRole === 'teacher') {
        const hasAccess = await TimetableEntry.exists({
            timetableId: entry.timetableId,
            teacherId: userId
        });
        if (!hasAccess) throw new ForbiddenError("Access denied");
    }

    // Check teacher conflict if changing teacher/time/day
    if (updates.teacherId || updates.timeSlotId || updates.dayOfWeek) {
        const conflict = await TimetableEntry.findOne({
            schoolId,
            teacherId: updates.teacherId || entry.teacherId,
            dayOfWeek: updates.dayOfWeek || entry.dayOfWeek,
            timeSlotId: updates.timeSlotId || entry.timeSlotId,
            _id: { $ne: id }
        });

        if (conflict) throw new ConflictError("Teacher already assigned at this time");
    }

    const updated = await TimetableEntry.findByIdAndUpdate(id, updates, { new: true });
    logger.info(`Entry updated: ${id}`);
    return updated;
};

// Deletes a specific timetable entry by its unique ID
export const deleteEntry = async (schoolId, id) => {
    const entry = await TimetableEntry.findOneAndDelete({ _id: id, schoolId });
    if (!entry) throw new NotFoundError("Entry not found");
    logger.info(`Entry deleted: ${id}`);
};

// TEACHER SCHEDULE
// Generates a day-wise grouped schedule view for a specific teacher
export const getTeacherSchedule = async (schoolId, teacherId) => {
    const entries = await TimetableEntry.find({ schoolId, teacherId })
        .populate("timetableId", "standard section academicYear")
        .populate("timeSlotId", "slotNumber startTime endTime slotType")
        .sort({ dayOfWeek: 1 })
        .lean();

    if (!entries.length) throw new NotFoundError("No schedule found for this teacher");

    // Group by day
    const sorted = {};
    DAYS_OF_WEEK.forEach(day => { sorted[day] = []; });
    entries.forEach(entry => {
        if (sorted[entry.dayOfWeek]) sorted[entry.dayOfWeek].push(entry);
    });
    DAYS_OF_WEEK.forEach(day => {
        sorted[day].sort((a, b) => (a.timeSlotId?.slotNumber || 0) - (b.timeSlotId?.slotNumber || 0));
    });

    return sorted;
};


// Fetches a grouped and formatted schedule based on user role and platform context
export const getUserTimetable = async (schoolId, userId, role, platform) => {
    if (!userId || !schoolId || !role || !platform) {
        throw new BadRequestError("userId, schoolId, role, and platform are required");
    }

    let query = { schoolId };

    if (role === "teacher") {
        query.teacherId = userId;
    } else if (role === "student") {
        // use StudentProfile to get grade/section
        const profile = await StudentProfile.findOne({ userId, schoolId }).lean();
        if (!profile) throw new NotFoundError("Student profile not found");

        const timetable = await Timetable.findOne({
            schoolId,
            standard: profile.standard,
            section: profile.section,
            academicYear: new Date().getFullYear()
        }).lean();

        if (!timetable) throw new NotFoundError("No timetable found for your class this year");
        query.timetableId = timetable._id;
    } else {
        throw new ForbiddenError("Only teachers and students can access timetable");
    }

    const result = await TimetableEntry.find(query)
        .populate("teacherId", "name")
        .populate("timetableId", "standard section academicYear")
        .populate("timeSlotId", "slotNumber startTime endTime slotType")
        .lean();

    // group by day
    const sorted = {};
    DAYS_OF_WEEK.forEach(day => { sorted[day] = []; });

    result.forEach(entry => {
        if (sorted[entry.dayOfWeek]) {
            sorted[entry.dayOfWeek].push(entry);
        }
    });

    // sort within each day
    DAYS_OF_WEEK.forEach(day => {
        sorted[day].sort((a, b) => (a.timeSlotId?.slotNumber || 0) - (b.timeSlotId?.slotNumber || 0));
    });

    // platform based response shaping
    if (platform === "mobile") {
        const formatted = {};
        Object.keys(sorted).forEach(day => {
            formatted[day] = sorted[day].map(entry => ({
                subject: entry.subject,
                teacher: entry.teacherId?.name,
                room: entry.roomNumber,
                startTime: entry.timeSlotId?.startTime,
                endTime: entry.timeSlotId?.endTime,
                slotNumber: entry.timeSlotId?.slotNumber,
                slotType: entry.timeSlotId?.slotType
            }));
        });
        return formatted;
    }

    return sorted; // web gets full populated objects
};
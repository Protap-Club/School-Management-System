import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "./Timetable.model.js";
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import StudentProfile from "../user/model/StudentProfile.model.js";

// HELPERS

// groups timetable entries by day of week (Monday, Tuesday, etc.)
// sorts each day's entries by slot number so they appear in chronological order
// used by both getTeacherSchedule and getUserTimetable to avoid duplicate logic
const groupEntriesByDay = (entries) => {
    const grouped = {};
    // initialize empty arrays for each day (ensures all days are present even if empty)
    DAYS_OF_WEEK.forEach(day => { grouped[day] = []; });

    // distribute entries into their respective day buckets
    entries.forEach(entry => {
        if (grouped[entry.dayOfWeek]) grouped[entry.dayOfWeek].push(entry);
    });

    // sort entries within each day by slot number (period 1, 2, 3, ...)
    DAYS_OF_WEEK.forEach(day => {
        grouped[day].sort((a, b) => (a.timeSlotId?.slotNumber || 0) - (b.timeSlotId?.slotNumber || 0));
    });

    return grouped;
};

// TIMESLOT SERVICES
// time slots represent the bell schedule (e.g., Period 1: 9:00-9:45)
// each school has its own set of time slots

// returns all time slots for a school sorted by slot number
export const getTimeSlots = async (schoolId) => {
    return await TimeSlot.find({ schoolId }).sort({ slotNumber: 1 }).lean();
};

// creates a new time slot after checking for duplicate slot numbers
export const createTimeSlot = async (schoolId, data) => {
    const exists = await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber });
    if (exists) throw new ConflictError(`Slot #${data.slotNumber} already exists`);

    const slot = await TimeSlot.create({ schoolId, ...data });
    logger.info(`TimeSlot created: ${slot._id}`);
    return slot;
};

// updates an existing time slot
// if slot number is being changed, ensures the new number is not already taken
export const updateTimeSlot = async (schoolId, id, data) => {
    if (data.slotNumber) {
        // exclude current slot from uniqueness check ($ne = not equal)
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

// deletes a time slot only if no timetable entry is currently using it
// prevents breaking existing schedules by removing active bell timings
export const deleteTimeSlot = async (schoolId, id) => {
    const inUse = await TimetableEntry.exists({ timeSlotId: id });
    if (inUse) throw new ConflictError("TimeSlot is currently in use");

    const slot = await TimeSlot.findOneAndDelete({ _id: id, schoolId });
    if (!slot) throw new NotFoundError("TimeSlot not found");
    logger.info(`TimeSlot deleted: ${id}`);
};

// TIMETABLE SERVICES
// a timetable is a header record representing one class's schedule (e.g., "Class 10-A, 2025")
// each timetable contains multiple entries (individual subject-teacher-slot assignments)

// returns all timetable headers for a school with optional filters
// sorted by most recent academic year first, then by class name
export const getTimetables = async (schoolId, filters = {}) => {
    const query = { schoolId };
    if (filters.standard) query.standard = filters.standard;
    if (filters.section) query.section = filters.section;
    if (filters.academicYear) query.academicYear = filters.academicYear;

    return await Timetable.find(query).sort({ academicYear: -1, standard: 1, section: 1 }).lean();
};

// fetches a single timetable with all its entries populated
// entries include teacher names and time slot details for display
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

// creates a new timetable header for a class + section + year
// only one timetable can exist per unique class-section-year combination
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

// deletes a timetable and all its associated entries
// this is a hard delete — both the header and every slot assignment gets removed
export const deleteTimetable = async (schoolId, id) => {
    const timetable = await Timetable.findOne({ _id: id, schoolId });
    if (!timetable) throw new NotFoundError("Timetable not found");

    // remove all entries first, then the timetable header
    await TimetableEntry.deleteMany({ timetableId: id });
    await Timetable.deleteOne({ _id: id, schoolId });
    logger.info(`Timetable deleted: ${id}`);
};

// ENTRY SERVICES
// entries are individual cells in the timetable grid (e.g., "Monday Period 2 = Math by Mr. Sharma")
// each entry links a day + time slot + teacher + subject to a timetable

// creates multiple entries with parallel conflict checking and bulk insert
// checks if any teacher is already assigned elsewhere at the same day + time slot
// break periods (no teacherId) skip conflict checks since they have no teacher
export const createEntries = async (schoolId, timetableId, entries) => {
    const timetable = await Timetable.findOne({ _id: timetableId, schoolId });
    if (!timetable) throw new NotFoundError("Timetable not found");

    // run all teacher conflict checks in parallel for better performance
    const conflictResults = await Promise.all(
        entries.map(async (entry) => {
            // break periods have no teacher — no conflict possible
            if (!entry.teacherId) return { entry, conflict: null, error: null };

            try {
                // check if this teacher is already teaching at the same day + time in another class
                const conflict = await TimetableEntry.findOne({
                    schoolId,
                    teacherId: entry.teacherId,
                    dayOfWeek: entry.dayOfWeek,
                    timeSlotId: entry.timeSlotId
                }).populate('timetableId', 'standard section');

                return { entry, conflict, error: null };
            } catch (error) {
                return { entry, conflict: null, error: error.message };
            }
        })
    );

    // separate valid entries from conflicting/failed ones
    const toInsert = [];
    const failed = [];

    for (const { entry, conflict, error } of conflictResults) {
        if (error) {
            failed.push({ ...entry, reason: error });
        } else if (conflict) {
            // include which class the teacher is busy in so admin can fix the conflict
            failed.push({
                ...entry,
                reason: `Teacher busy in ${conflict.timetableId.standard}-${conflict.timetableId.section}`
            });
        } else {
            toInsert.push({ schoolId, timetableId, ...entry });
        }
    }

    // bulk insert all valid entries at once (faster than one-by-one)
    // ordered: false means it won't stop on first error
    let created = [];
    if (toInsert.length > 0) {
        created = await TimetableEntry.insertMany(toInsert, { ordered: false });
    }

    logger.info(`Entries created: ${created.length}, failed: ${failed.length}`);
    return { created: created.length, failed };
};

// updates a single entry (admin-only — enforced at route level)
// if teacher, day, or time slot changes, re-checks for scheduling conflicts
export const updateEntry = async (schoolId, id, updates) => {
    const entry = await TimetableEntry.findOne({ _id: id, schoolId }).lean();
    if (!entry) throw new NotFoundError("Entry not found");

    // only check conflicts when fields that affect scheduling are changed
    if (updates.teacherId || updates.timeSlotId || updates.dayOfWeek) {
        // use existing values as fallback for fields not being updated
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

// deletes a single timetable entry
// scoped by schoolId to prevent cross-school deletion
export const deleteEntry = async (schoolId, id) => {
    const entry = await TimetableEntry.findOneAndDelete({ _id: id, schoolId });
    if (!entry) throw new NotFoundError("Entry not found");
    logger.info(`Entry deleted: ${id}`);
};

// SCHEDULE SERVICES
// schedule views return a day-wise grouped view of entries
// used by teachers and students to see their weekly schedule

// returns a teacher's full weekly schedule grouped by day
// called by admin to view any teacher's assignments
export const getTeacherSchedule = async (schoolId, teacherId) => {
    const entries = await TimetableEntry.find({ schoolId, teacherId })
        .populate("timetableId", "standard section academicYear")
        .populate("timeSlotId", "slotNumber startTime endTime slotType")
        .sort({ dayOfWeek: 1 })
        .lean();

    if (!entries.length) throw new NotFoundError("No schedule found for this teacher");

    return groupEntriesByDay(entries);
};

// returns a personalized timetable based on user role
// teachers see all classes they teach across the week
// students see their class timetable based on their standard + section
// mobile platform gets a simplified response shape (no nested IDs)
export const getUserTimetable = async (schoolId, userId, role, platform) => {
    let query = { schoolId };

    if (role === "teacher") {
        // teacher sees entries where they are the assigned teacher
        query.teacherId = userId;
    } else if (role === "student") {
        // student needs their class info from profile to find the right timetable
        const profile = await StudentProfile.findOne({ userId, schoolId }).lean();
        if (!profile) throw new NotFoundError("Student profile not found");

        // find the most recent timetable for student's class (latest academic year first)
        // this avoids hardcoding the year and always picks the current/latest schedule
        const timetable = await Timetable.findOne({
            schoolId,
            standard: profile.standard,
            section: profile.section,
        }).sort({ academicYear: -1 }).lean();

        if (!timetable) throw new NotFoundError("No timetable found for your class");
        query.timetableId = timetable._id;
    } else {
        throw new ForbiddenError("Only teachers and students can access their schedule");
    }

    const result = await TimetableEntry.find(query)
        .populate("teacherId", "name")
        .populate("timetableId", "standard section academicYear")
        .populate("timeSlotId", "slotNumber startTime endTime slotType")
        .lean();

    const grouped = groupEntriesByDay(result);

    // mobile app gets a flat structure without mongo IDs for cleaner display
    if (platform === "mobile") {
        const formatted = {};
        Object.keys(grouped).forEach(day => {
            formatted[day] = grouped[day].map(entry => ({
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

    return grouped;
};
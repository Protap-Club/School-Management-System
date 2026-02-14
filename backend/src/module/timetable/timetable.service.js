import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "./Timetable.model.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";

// TIMESLOT SERVICES

export const getTimeSlots = async (schoolId) => {
    return await TimeSlot.find({ schoolId }).sort({ slotNumber: 1 }).lean();
};

export const createTimeSlot = async (schoolId, data) => {
    const exists = await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber });
    if (exists) throw new ConflictError(`Slot #${data.slotNumber} already exists`);
    
    const slot = await TimeSlot.create({ schoolId, ...data });
    logger.info(`TimeSlot created: ${slot._id}`);
    return slot;
};

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

export const deleteTimeSlot = async (schoolId, id) => {
    // Check if slot is in use
    const inUse = await TimetableEntry.exists({ timeSlotId: id });
    if (inUse) throw new ConflictError("TimeSlot is currently in use");
    
    await TimeSlot.findOneAndDelete({ _id: id, schoolId });
    logger.info(`TimeSlot deleted: ${id}`);
};

// TIMETABLE SERVICES
export const getTimetables = async (schoolId, teacherId = null) => {
    // If teacher, show only timetables they're assigned to
    if (teacherId) {
        const entryIds = await TimetableEntry.distinct('timetableId', { 
            schoolId, 
            teacherId 
        });
        return await Timetable.find({ _id: { $in: entryIds } })
            .sort({ standard: 1, section: 1 })
            .lean();
    }
    
    // Admin sees all
    return await Timetable.find({ schoolId })
        .sort({ standard: 1, section: 1 })
        .lean();
};

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

export const deleteTimetable = async (schoolId, id) => {
    await TimetableEntry.deleteMany({ timetableId: id });
    await Timetable.findOneAndDelete({ _id: id, schoolId });
    logger.info(`Timetable deleted: ${id}`);
};

// ENTRY SERVICES
export const createEntries = async (schoolId, timetableId, entries) => {
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

export const deleteEntry = async (schoolId, id) => {
    await TimetableEntry.findOneAndDelete({ _id: id, schoolId });
    logger.info(`Entry deleted: ${id}`);
};

export const getTeacherSchedule = async (schoolId, teacherId) => {
    const entries = await TimetableEntry.find({ schoolId, teacherId })
        .populate('timetableId', 'standard section')
        .populate('timeSlotId', 'slotNumber startTime endTime')
        .sort({ dayOfWeek: 1, 'timeSlotId.slotNumber': 1 })
        .lean();
    
    // Group by day
    const schedule = {};
    DAYS_OF_WEEK.forEach(day => {
        schedule[day] = entries
            .filter(e => e.dayOfWeek === day)
            .map(e => ({
                class: `${e.timetableId.standard}-${e.timetableId.section}`,
                subject: e.subject,
                startTime: e.timeSlotId.startTime,
                endTime: e.timeSlotId.endTime,
                room: e.roomNumber
            }));
    });
    
    return schedule;
};
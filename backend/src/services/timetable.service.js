/**
 * Timetable Service - Consolidated business logic for Timetable feature.
 * Handles TimeSlot, Timetable, and TimetableEntry operations.
 */

import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "../models/Timetable.model.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// TimeSlot Operations
// ═══════════════════════════════════════════════════════════════

export const createTimeSlot = async (schoolId, slotData) => {
    logger.info(`Creating time slot for school ${schoolId}: Slot #${slotData.slotNumber}`);

    const existing = await TimeSlot.findOne({
        schoolId,
        slotNumber: slotData.slotNumber,
        isActive: true
    });

    if (existing) {
        throw new CustomError(`Slot number ${slotData.slotNumber} already exists for this school`, 409);
    }

    const timeSlot = await TimeSlot.create({
        schoolId,
        ...slotData
    });

    logger.info(`Time slot #${timeSlot.slotNumber} created for school ${schoolId}`);
    return timeSlot;
};

export const getTimeSlots = async (schoolId) => {
    logger.debug(`Fetching time slots for school ${schoolId}`);
    
    const slots = await TimeSlot.find({ schoolId, isActive: true })
        .sort({ slotNumber: 1 });
    
    return slots;
};

export const updateTimeSlot = async (schoolId, slotId, updateData) => {
    logger.info(`Updating time slot ${slotId} for school ${schoolId}`);

    const slot = await TimeSlot.findOne({ _id: slotId, schoolId });
    if (!slot) {
        throw new CustomError("Time slot not found", 404);
    }

    // If updating slotNumber, check for conflicts
    if (updateData.slotNumber && updateData.slotNumber !== slot.slotNumber) {
        const existing = await TimeSlot.findOne({
            schoolId,
            slotNumber: updateData.slotNumber,
            isActive: true,
            _id: { $ne: slotId }
        });
        if (existing) {
            throw new CustomError(`Slot number ${updateData.slotNumber} already exists`, 409);
        }
    }

    Object.assign(slot, updateData);
    await slot.save();

    logger.info(`Time slot ${slotId} updated successfully`);
    return slot;
};

export const deleteTimeSlot = async (schoolId, slotId) => {
    logger.info(`Deleting time slot ${slotId} for school ${schoolId}`);

    const slot = await TimeSlot.findOne({ _id: slotId, schoolId });
    if (!slot) {
        throw new CustomError("Time slot not found", 404);
    }

    // Check if slot is used in any timetable entries
    const entryCount = await TimetableEntry.countDocuments({ timeSlotId: slotId, isActive: true });
    if (entryCount > 0) {
        throw new CustomError(`Cannot delete: ${entryCount} timetable entries use this slot`, 400);
    }

    slot.isActive = false;
    await slot.save();

    logger.info(`Time slot ${slotId} soft-deleted`);
    return { message: "Time slot deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// Timetable Operations
// ═══════════════════════════════════════════════════════════════

export const createTimetable = async (schoolId, timetableData) => {
    const { standard, section, academicYear } = timetableData;
    logger.info(`Creating timetable for school ${schoolId}: ${standard}-${section} (${academicYear})`);

    const existing = await Timetable.findOne({
        schoolId,
        standard,
        section,
        academicYear,
        isActive: true
    });

    if (existing) {
        throw new CustomError(
            `Timetable for ${standard}-${section} (${academicYear}) already exists`,
            409
        );
    }

    const timetable = await Timetable.create({
        schoolId,
        standard,
        section,
        academicYear
    });

    logger.info(`Timetable created: ${timetable._id}`);
    return timetable;
};

export const getTimetables = async (schoolId, filters = {}) => {
    logger.debug(`Fetching timetables for school ${schoolId}`);

    const query = { schoolId, isActive: true };
    if (filters.standard) query.standard = filters.standard;
    if (filters.section) query.section = filters.section;
    if (filters.academicYear) query.academicYear = filters.academicYear;

    const timetables = await Timetable.find(query).sort({ standard: 1, section: 1 });
    return timetables;
};

export const getTimetableById = async (schoolId, timetableId) => {
    logger.debug(`Fetching timetable ${timetableId} for school ${schoolId}`);

    const timetable = await Timetable.findOne({ _id: timetableId, schoolId, isActive: true });
    if (!timetable) {
        throw new CustomError("Timetable not found", 404);
    }

    // Fetch all entries for this timetable
    const entries = await TimetableEntry.find({ timetableId, isActive: true })
        .populate("timeSlotId", "slotNumber startTime endTime slotType label")
        .populate("teacherId", "name email")
        .sort({ dayOfWeek: 1 });

    return { timetable, entries };
};

export const updateTimetableStatus = async (schoolId, timetableId, status) => {
    logger.info(`Updating timetable ${timetableId} status to ${status}`);

    const timetable = await Timetable.findOne({ _id: timetableId, schoolId, isActive: true });
    if (!timetable) {
        throw new CustomError("Timetable not found", 404);
    }

    timetable.status = status;
    await timetable.save();

    logger.info(`Timetable ${timetableId} status updated to ${status}`);
    return timetable;
};

export const deleteTimetable = async (schoolId, timetableId) => {
    logger.info(`Deleting timetable ${timetableId} for school ${schoolId}`);

    const timetable = await Timetable.findOne({ _id: timetableId, schoolId });
    if (!timetable) {
        throw new CustomError("Timetable not found", 404);
    }

    // Soft delete all entries
    await TimetableEntry.updateMany(
        { timetableId, isActive: true },
        { isActive: false }
    );

    timetable.isActive = false;
    await timetable.save();

    logger.info(`Timetable ${timetableId} and its entries soft-deleted`);
    return { message: "Timetable deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// TimetableEntry Operations (with Conflict Detection)
// ═══════════════════════════════════════════════════════════════

/**
 * Rule B: Check if teacher has a conflict at the given time
 */
const checkTeacherConflict = async (teacherId, dayOfWeek, timeSlotId, excludeEntryId = null) => {
    if (!teacherId) return null; // No conflict for break slots

    const query = {
        teacherId,
        dayOfWeek,
        timeSlotId,
        isActive: true
    };

    if (excludeEntryId) {
        query._id = { $ne: excludeEntryId };
    }

    const conflict = await TimetableEntry.findOne(query)
        .populate("timetableId", "standard section");

    return conflict;
};

/**
 * Rule C: Validate entry based on slot type
 */
const validateEntryForSlotType = async (timeSlotId, entryData) => {
    const timeSlot = await TimeSlot.findById(timeSlotId);
    if (!timeSlot) {
        throw new CustomError("Time slot not found", 404);
    }

    // For CLASS slots, subject and teacherId are required
    if (timeSlot.slotType === "CLASS") {
        if (!entryData.subject || !entryData.teacherId) {
            throw new CustomError("Subject and teacher are required for class slots", 400);
        }
    }

    return timeSlot;
};

export const createEntry = async (schoolId, timetableId, entryData) => {
    const { dayOfWeek, timeSlotId, subject, teacherId, roomNumber, notes } = entryData;
    logger.info(`Creating entry for timetable ${timetableId}: ${dayOfWeek} - Slot ${timeSlotId}`);

    // Verify timetable exists
    const timetable = await Timetable.findOne({ _id: timetableId, schoolId, isActive: true });
    if (!timetable) {
        throw new CustomError("Timetable not found", 404);
    }

    // Rule C: Validate based on slot type
    const timeSlot = await validateEntryForSlotType(timeSlotId, entryData);

    // Rule B: Check teacher conflict (only for CLASS slots)
    if (timeSlot.slotType === "CLASS" && teacherId) {
        const conflict = await checkTeacherConflict(teacherId, dayOfWeek, timeSlotId);
        if (conflict) {
            throw new CustomError(
                `Teacher already assigned to ${conflict.timetableId.standard}-${conflict.timetableId.section} at this time`,
                409
            );
        }
    }

    const entry = await TimetableEntry.create({
        schoolId,
        timetableId,
        dayOfWeek,
        timeSlotId,
        subject: timeSlot.slotType === "CLASS" ? subject : null,
        teacherId: timeSlot.slotType === "CLASS" ? teacherId : null,
        roomNumber,
        notes
    });

    logger.info(`Entry created: ${entry._id}`);
    return entry;
};

export const createBulkEntries = async (schoolId, timetableId, entries) => {
    logger.info(`Creating ${entries.length} bulk entries for timetable ${timetableId}`);

    // Verify timetable exists
    const timetable = await Timetable.findOne({ _id: timetableId, schoolId, isActive: true });
    if (!timetable) {
        throw new CustomError("Timetable not found", 404);
    }

    const results = { created: [], failed: [] };

    for (const entryData of entries) {
        try {
            // Rule C: Validate based on slot type
            const timeSlot = await validateEntryForSlotType(entryData.timeSlotId, entryData);

            // Rule B: Check teacher conflict (only for CLASS slots)
            if (timeSlot.slotType === "CLASS" && entryData.teacherId) {
                const conflict = await checkTeacherConflict(
                    entryData.teacherId,
                    entryData.dayOfWeek,
                    entryData.timeSlotId
                );
                if (conflict) {
                    results.failed.push({
                        entry: entryData,
                        reason: `Teacher conflict with ${conflict.timetableId.standard}-${conflict.timetableId.section}`
                    });
                    continue;
                }
            }

            const entry = await TimetableEntry.create({
                schoolId,
                timetableId,
                dayOfWeek: entryData.dayOfWeek,
                timeSlotId: entryData.timeSlotId,
                subject: timeSlot.slotType === "CLASS" ? entryData.subject : null,
                teacherId: timeSlot.slotType === "CLASS" ? entryData.teacherId : null,
                roomNumber: entryData.roomNumber,
                notes: entryData.notes
            });

            results.created.push(entry);
        } catch (error) {
            results.failed.push({
                entry: entryData,
                reason: error.message
            });
        }
    }

    logger.info(`Bulk entries: ${results.created.length} created, ${results.failed.length} failed`);
    return results;
};

export const updateEntry = async (schoolId, entryId, updateData) => {
    logger.info(`Updating entry ${entryId}`);

    const entry = await TimetableEntry.findOne({ _id: entryId, schoolId, isActive: true });
    if (!entry) {
        throw new CustomError("Entry not found", 404);
    }

    // Get the time slot type
    const timeSlotId = updateData.timeSlotId || entry.timeSlotId;
    const timeSlot = await TimeSlot.findById(timeSlotId);
    if (!timeSlot) {
        throw new CustomError("Time slot not found", 404);
    }

    // Rule B: Check teacher conflict if teacher or time is changing
    const newTeacherId = updateData.teacherId !== undefined ? updateData.teacherId : entry.teacherId;
    const newDayOfWeek = updateData.dayOfWeek || entry.dayOfWeek;
    const newTimeSlotId = updateData.timeSlotId || entry.timeSlotId;

    if (timeSlot.slotType === "CLASS" && newTeacherId) {
        const conflict = await checkTeacherConflict(newTeacherId, newDayOfWeek, newTimeSlotId, entryId);
        if (conflict) {
            throw new CustomError(
                `Teacher already assigned to ${conflict.timetableId.standard}-${conflict.timetableId.section} at this time`,
                409
            );
        }
    }

    // Apply updates
    if (updateData.dayOfWeek) entry.dayOfWeek = updateData.dayOfWeek;
    if (updateData.timeSlotId) entry.timeSlotId = updateData.timeSlotId;
    if (timeSlot.slotType === "CLASS") {
        if (updateData.subject !== undefined) entry.subject = updateData.subject;
        if (updateData.teacherId !== undefined) entry.teacherId = updateData.teacherId;
    }
    if (updateData.roomNumber !== undefined) entry.roomNumber = updateData.roomNumber;
    if (updateData.notes !== undefined) entry.notes = updateData.notes;

    await entry.save();

    logger.info(`Entry ${entryId} updated`);
    return entry;
};

export const deleteEntry = async (schoolId, entryId) => {
    logger.info(`Deleting entry ${entryId}`);

    const entry = await TimetableEntry.findOne({ _id: entryId, schoolId });
    if (!entry) {
        throw new CustomError("Entry not found", 404);
    }

    entry.isActive = false;
    await entry.save();

    logger.info(`Entry ${entryId} soft-deleted`);
    return { message: "Entry deleted successfully" };
};

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule
// ═══════════════════════════════════════════════════════════════

export const getTeacherSchedule = async (schoolId, teacherId, academicYear = null) => {
    logger.info(`Fetching schedule for teacher ${teacherId} in school ${schoolId}`);

    const query = {
        schoolId,
        teacherId,
        isActive: true
    };

    // Build aggregation to filter by academic year if provided
    const entries = await TimetableEntry.find(query)
        .populate({
            path: "timetableId",
            match: academicYear ? { academicYear, isActive: true } : { isActive: true },
            select: "standard section academicYear status"
        })
        .populate("timeSlotId", "slotNumber startTime endTime slotType label")
        .sort({ dayOfWeek: 1 });

    // Filter out entries where timetable didn't match (null from populate)
    const filteredEntries = entries.filter(e => e.timetableId !== null);

    // Group by day for easier consumption
    const schedule = {};
    for (const day of DAYS_OF_WEEK) {
        schedule[day] = filteredEntries.filter(e => e.dayOfWeek === day);
    }

    logger.info(`Found ${filteredEntries.length} schedule entries for teacher ${teacherId}`);
    return { teacherId, schedule, totalEntries: filteredEntries.length };
};

import mongoose from "mongoose";
import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "../models/Timetable.model.js";
import { CustomError } from "./utils/customError.js";
import logger from "../config/logger.js";


// Master Functions: Slots & Timetables
export const manageTimeSlots = async (schoolId, action, data = {}) => {
    if (action === 'get') return await TimeSlot.find({ schoolId, isActive: true }).sort({ slotNumber: 1 }).lean();

    if (action === 'create') {
        if (await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber, isActive: true })) throw new CustomError(`Slot #${data.slotNumber} exists`, 409);
        logger.info(`Creating TimeSlot #${data.slotNumber} for school ${schoolId}`);
        return await TimeSlot.create({ schoolId, ...data });
    }

    if (action === 'update') {
        if (data.slotNumber && await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber, isActive: true, _id: { $ne: data.id } })) throw new CustomError(`Slot #${data.slotNumber} taken`, 409);
        logger.info(`Updating TimeSlot ${data.id} for school ${schoolId}`);
        return await TimeSlot.findOneAndUpdate({ _id: data.id, schoolId }, data, { new: true });
    }

    if (action === 'delete') {
        if (await TimetableEntry.countDocuments({ timeSlotId: data.id, isActive: true }) > 0) throw new CustomError("Slot is currently in use", 400);
        logger.warn(`Soft-deleting TimeSlot ${data.id} for school ${schoolId}`);
        return await TimeSlot.findOneAndUpdate({ _id: data.id, schoolId }, { isActive: false }, { new: true });
    }
};

export const manageTimetables = async (schoolId, action, data = {}) => {
    if (action === 'create') {
        if (await Timetable.exists({ schoolId, standard: data.standard, section: data.section, academicYear: data.academicYear, isActive: true })) throw new CustomError("Timetable exists", 409);
        logger.info(`Creating Timetable ${data.standard}-${data.section} for school ${schoolId}`);
        return await Timetable.create({ schoolId, ...data });
    }

    if (action === 'get_all') return await Timetable.find({ schoolId, isActive: true, ...data }).sort({ standard: 1, section: 1 }).lean();

    if (action === 'get_one') {
        const timetable = await Timetable.findOne({ _id: data.id, schoolId, isActive: true }).lean();
        if (!timetable) throw new CustomError("Timetable not found", 404);
        const entries = await TimetableEntry.find({ timetableId: data.id, isActive: true }).populate("timeSlotId teacherId").sort({ dayOfWeek: 1 }).lean();
        return { timetable, entries };
    }

    if (action === 'delete') {
        const session = await mongoose.startSession();
        session.startTransaction(); // Start transaction to ensure atomic deletion of timetable and entries
        try {
            await TimetableEntry.updateMany({ timetableId: data.id }, { isActive: false }, { session });
            await Timetable.findByIdAndUpdate(data.id, { isActive: false }, { session });
            await session.commitTransaction();
            logger.warn(`Deleted Timetable ${data.id} and associated entries`);
            return { message: "Deleted" };
        } catch (e) { await session.abortTransaction(); throw e; } finally { session.endSession(); }
    }
};


// Master Functions: Entries (Optimized Bulk & Logic)
export const syncEntries = async (schoolId, timetableId, entriesData) => {
    const session = await mongoose.startSession();
    session.startTransaction(); // Use transaction to prevent partial data entry during bulk creation
    try {
        const entries = Array.isArray(entriesData) ? entriesData : [entriesData];
        const slotIds = [...new Set(entries.map(e => e.timeSlotId))];
        const slots = new Map((await TimeSlot.find({ _id: { $in: slotIds }, schoolId }).lean()).map(s => [s._id.toString(), s]));
        
        const teacherIds = [...new Set(entries.map(e => e.teacherId).filter(Boolean))];
        const days = [...new Set(entries.map(e => e.dayOfWeek))];
        const conflicts = await TimetableEntry.find({ schoolId, isActive: true, teacherId: { $in: teacherIds }, dayOfWeek: { $in: days }, timeSlotId: { $in: slotIds } }).populate('timetableId').lean();

        const valid = [], failed = [];
        for (const entry of entries) {
            const slot = slots.get(entry.timeSlotId);
            if (!slot) { failed.push({ ...entry, reason: "Invalid Slot" }); continue; }
            if (slot.slotType === "CLASS" && (!entry.teacherId || !entry.subject)) { failed.push({ ...entry, reason: "Missing Teacher/Subject" }); continue; }
            
            const hasConflict = conflicts.find(c => c.teacherId.toString() === entry.teacherId && c.dayOfWeek === entry.dayOfWeek && c.timeSlotId.toString() === entry.timeSlotId);
            if (hasConflict) { failed.push({ ...entry, reason: `Teacher busy in ${hasConflict.timetableId.standard}-${hasConflict.timetableId.section}` }); continue; }
            
            valid.push({ ...entry, schoolId, timetableId });
        }

        if (valid.length) await TimetableEntry.insertMany(valid, { session });
        await session.commitTransaction();
        logger.info(`Synced entries for ${timetableId}: ${valid.length} created, ${failed.length} failed`);
        return { created: valid.length, failed };
    } catch (e) { await session.abortTransaction(); logger.error(`Sync error: ${e.message}`); throw e; } finally { session.endSession(); }
};

export const updateEntry = async (schoolId, id, updates) => {
    const entry = await TimetableEntry.findOne({ _id: id, schoolId, isActive: true });
    if (!entry) throw new CustomError("Entry not found", 404);
    
    const tId = updates.teacherId || entry.teacherId;
    const day = updates.dayOfWeek || entry.dayOfWeek;
    const slotId = updates.timeSlotId || entry.timeSlotId;

    if (tId && (updates.teacherId || updates.timeSlotId || updates.dayOfWeek)) {
        const conflict = await TimetableEntry.findOne({ schoolId, teacherId: tId, dayOfWeek: day, timeSlotId: slotId, isActive: true, _id: { $ne: id } }).populate('timetableId');
        if (conflict) throw new CustomError(`Teacher busy in ${conflict.timetableId.standard}-${conflict.timetableId.section}`, 409);
    }

    logger.info(`Updating Entry ${id} for school ${schoolId}`);
    return await TimetableEntry.findByIdAndUpdate(id, updates, { new: true });
};


// Teacher Schedule (Aggregation)
export const getTeacherSchedule = async (schoolId, teacherId, academicYear = null) => {
    logger.info(`Fetching schedule for teacher ${teacherId}`);
    const raw = await TimetableEntry.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), teacherId: new mongoose.Types.ObjectId(teacherId), isActive: true } },
        { $lookup: { from: "timetables", localField: "timetableId", foreignField: "_id", as: "tt" } },
        { $unwind: "$tt" },
        { $match: academicYear ? { "tt.academicYear": academicYear, "tt.isActive": true } : { "tt.isActive": true } },
        { $lookup: { from: "timeslots", localField: "timeSlotId", foreignField: "_id", as: "slot" } },
        { $unwind: "$slot" },
        { $sort: { "slot.slotNumber": 1 } }, // Order by time slot number to ensure chronological sequence
        { $project: { day: "$dayOfWeek", class: { $concat: ["$tt.standard", "-", "$tt.section"] }, startTime: "$slot.startTime", endTime: "$slot.endTime", subject: 1, roomNumber: 1 } }
    ]);

    const structured = {};
    DAYS_OF_WEEK.forEach(day => { structured[day] = raw.filter(e => e.day === day); }); // Group entries by day of week for frontend consumption
    return structured;
};
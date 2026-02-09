import mongoose from "mongoose";
import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "./Timetable.model.js";
import { CustomError } from "../../utils/customError.js";
import logger from "../../config/logger.js";

// Manage TimeSlots (get, create, update, delete)
export const manageTimeSlots = async (schoolId, action, data = {}) => {
    // Get all slots
    if (action === 'get') {
        const result = await TimeSlot.find({ schoolId, isActive: true }).sort({ slotNumber: 1 }).lean();
        const slots = result.map(s => ({
            _id: s._id,
            slotNumber: s.slotNumber,
            startTime: s.startTime,
            endTime: s.endTime,
            slotType: s.slotType
        }));
        return { slots };
    }

    // Create a new slot
    if (action === 'create') {
        if (await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber, isActive: true })) throw new CustomError(`Slot #${data.slotNumber} exists`, 409);
        logger.info(`Creating TimeSlot #${data.slotNumber} for school ${schoolId}`);
        const slot = await TimeSlot.create({ schoolId, ...data });
        return {
            slot: {
                _id: slot._id,
                slotNumber: slot.slotNumber,
                startTime: slot.startTime,
                endTime: slot.endTime,
                slotType: slot.slotType
            }
        };
    }

    // Update a slot
    if (action === 'update') {
        if (data.slotNumber && await TimeSlot.exists({ schoolId, slotNumber: data.slotNumber, isActive: true, _id: { $ne: data.id } })) throw new CustomError(`Slot #${data.slotNumber} taken`, 409);
        logger.info(`Updating TimeSlot ${data.id} for school ${schoolId}`);
        const updated = await TimeSlot.findOneAndUpdate({ _id: data.id, schoolId }, data, { new: true }).lean();
        if (!updated) throw new CustomError("Slot not found", 404);
        return {
            slot: {
                _id: updated._id,
                slotNumber: updated.slotNumber,
                startTime: updated.startTime,
                endTime: updated.endTime,
                slotType: updated.slotType
            }
        };
    }

    // Delete a slot
    if (action === 'delete') {
        if (await TimetableEntry.countDocuments({ timeSlotId: data.id, isActive: true }) > 0) throw new CustomError("Slot is currently in use", 400);
        logger.warn(`Soft-deleting TimeSlot ${data.id} for school ${schoolId}`);
        const deleted = await TimeSlot.findOneAndUpdate({ _id: data.id, schoolId }, { isActive: false }, { new: true }).lean();
        return {
            deletedSlot: {
                _id: deleted?._id,
                isActive: false
            }
        };
    }
};

// Manage Timetables (create, get_all, get_one, delete)
export const manageTimetables = async (schoolId, action, data = {}) => {
    // Create a new timetable
    if (action === 'create') {
        if (await Timetable.exists({ schoolId, standard: data.standard, section: data.section, academicYear: data.academicYear, isActive: true })) throw new CustomError("Timetable exists", 409);
        logger.info(`Creating Timetable ${data.standard}-${data.section} for school ${schoolId}`);
        const timetable = await Timetable.create({ schoolId, ...data });
        return {
            timetable: {
                _id: timetable._id,
                standard: timetable.standard,
                section: timetable.section,
                academicYear: timetable.academicYear
            }
        };
    }

    // Get all active timetables (optionally filter by teacher assignment)
    if (action === 'get_all') {
        let timetableIds = null;
        
        // If teacherId is provided, only return timetables where teacher has entries
        if (data.teacherId) {
            const teacherEntries = await TimetableEntry.find({
                schoolId,
                teacherId: data.teacherId,
                isActive: true
            }).distinct('timetableId');
            timetableIds = teacherEntries;
        }
        
        const query = { schoolId, isActive: true };
        if (timetableIds) {
            query._id = { $in: timetableIds };
        }
        
        const result = await Timetable.find(query).sort({ standard: 1, section: 1 }).lean();
        const timetables = result.map(t => ({ _id: t._id, standard: t.standard, section: t.section, academicYear: t.academicYear }));
        return { timetables };
    }

    // Get a specific timetable with entries
    if (action === 'get_one') {
        const timetable = await Timetable.findOne({ _id: data.id, schoolId, isActive: true }).lean();
        if (!timetable) throw new CustomError("Timetable not found", 404);
        const entries = await TimetableEntry.find({ timetableId: data.id, isActive: true }).populate("timeSlotId teacherId").sort({ dayOfWeek: 1 }).lean();

        return {
            timetable: {
                _id: timetable._id,
                standard: timetable.standard,
                section: timetable.section,
                academicYear: timetable.academicYear
            },
            entries: entries.map(e => ({
                _id: e._id,
                dayOfWeek: e.dayOfWeek,
                subject: e.subject,
                timeSlotId: e.timeSlotId ? { _id: e.timeSlotId._id, slotNumber: e.timeSlotId.slotNumber } : null,
                teacherId: e.teacherId ? { _id: e.teacherId._id, name: e.teacherId.name } : null
            }))
        };
    }

    // Delete a timetable
    if (action === 'delete') {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await TimetableEntry.updateMany({ timetableId: data.id }, { isActive: false }, { session });
            await Timetable.findByIdAndUpdate(data.id, { isActive: false }, { session });
            await session.commitTransaction();
            logger.warn(`Deleted Timetable ${data.id}`);
            return {
                deletedTimetable: {
                    _id: data.id,
                    isActive: false
                }
            };
        } catch (e) { await session.abortTransaction(); throw e; } finally { session.endSession(); }
    }

    // Update Timetable Status (Publish/Draft)
    if (action === 'update_status') {
        const { id, status } = data;
        const timetable = await Timetable.findOneAndUpdate(
            { _id: id, schoolId, isActive: true },
            { status },
            { new: true }
        ).lean();

        if (!timetable) throw new CustomError("Timetable not found", 404);
        logger.info(`Timetable ${id} status updated to ${status}`);
        return { timetable: { _id: timetable._id, status: timetable.status } };
    }

    // Default fallback if action not found
    throw new CustomError("Invalid action", 400);
};

// Sync entries in bulk
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
        return {
            syncResult: {
                createdCount: valid.length,
                failedEntries: failed
            }
        };
    } catch (e) { await session.abortTransaction(); logger.error(`Sync error: ${e.message}`); throw e; } finally { session.endSession(); }
};

// Update a specific entry (with teacher permission check)
export const updateEntry = async (schoolId, id, updates, user = null) => {
    const entry = await TimetableEntry.findOne({ _id: id, schoolId, isActive: true }).lean();
    if (!entry) throw new CustomError("Entry not found", 404);

    // Permission check: Teachers can edit any entry in a timetable they're assigned to
    if (user && user.role === 'teacher') {
        // Check if teacher has any assignment in this timetable
        const hasAssignment = await TimetableEntry.exists({
            timetableId: entry.timetableId,
            teacherId: user._id,
            isActive: true
        });
        if (!hasAssignment) {
            throw new CustomError("You can only edit entries in classes you're assigned to", 403);
        }
    }

    const tId = updates.teacherId || entry.teacherId;
    const day = updates.dayOfWeek || entry.dayOfWeek;
    const slotId = updates.timeSlotId || entry.timeSlotId;

    if (tId && (updates.teacherId || updates.timeSlotId || updates.dayOfWeek)) {
        const conflict = await TimetableEntry.findOne({ schoolId, teacherId: tId, dayOfWeek: day, timeSlotId: slotId, isActive: true, _id: { $ne: id } }).populate('timetableId');
        if (conflict) throw new CustomError(`Teacher busy in ${conflict.timetableId.standard}-${conflict.timetableId.section}`, 409);
    }

    logger.info(`Updating Entry ${id} for school ${schoolId}`);
    const updated = await TimetableEntry.findByIdAndUpdate(id, updates, { new: true }).lean();
    return {
        entry: {
            _id: updated._id,
            subject: updated.subject,
            teacherId: updated.teacherId,
            timeSlotId: updated.timeSlotId,
            dayOfWeek: updated.dayOfWeek
        }
    };
};

// Get teacher's schedule
export const getTeacherSchedule = async (schoolId, teacherId, academicYear = null) => {
    logger.info(`Fetching schedule for teacher ${teacherId} in school ${schoolId}`);
    const raw = await TimetableEntry.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), teacherId: new mongoose.Types.ObjectId(teacherId), isActive: true } },
        { $lookup: { from: "timetables", localField: "timetableId", foreignField: "_id", as: "tt" } },
        { $unwind: "$tt" },
        { $match: academicYear ? { "tt.academicYear": academicYear, "tt.isActive": true } : { "tt.isActive": true } },
        { $lookup: { from: "timeslots", localField: "timeSlotId", foreignField: "_id", as: "slot" } },
        { $unwind: "$slot" },
        { $sort: { "slot.slotNumber": 1 } },
        { $project: { _id: 1, day: "$dayOfWeek", class: { $concat: ["$tt.standard", "-", "$tt.section"] }, startTime: "$slot.startTime", endTime: "$slot.endTime", subject: 1, roomNumber: 1, timeSlotId: "$slot._id" } }
    ]);

    logger.info(`Teacher schedule raw results: ${raw.length} entries for ${teacherId}`);

    const structured = {};
    DAYS_OF_WEEK.forEach(day => { structured[day] = raw.filter(e => e.day === day); });
    return {
        teacherSchedule: structured
    };
};
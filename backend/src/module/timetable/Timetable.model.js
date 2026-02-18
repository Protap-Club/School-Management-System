import mongoose from "mongoose";

// TimeSlot Schema (bell timings)
const timeSlotSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    slotNumber: { type: Number, required: true },
    startTime: { type: String, required: true },  // "08:00"
    endTime: { type: String, required: true },    // "09:00"
    slotType: { type: String, enum: ["CLASS", "BREAK"], default: "CLASS" },
}, { timestamps: true });

timeSlotSchema.index({ schoolId: 1, slotNumber: 1 }, { unique: true });

// Timetable Schema (one per class)
const timetableSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    standard: { type: String, required: true, trim: true },  // "10"
    section: { type: String, required: true, trim: true },   // "A"
    academicYear: { type: Number, required: true },          // 2024
}, { timestamps: true });

timetableSchema.index({ schoolId: 1, standard: 1, section: 1, academicYear: 1 }, { unique: true });

// TimetableEntry Schema (individual cells)
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timetableEntrySchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    timetableId: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable", required: true, index: true },
    dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
    timeSlotId: { type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot", required: true },
    subject: { type: String, trim: true },           // "Mathematics"
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    roomNumber: { type: String, trim: true },        // "Room 101"
}, { timestamps: true });

timetableEntrySchema.index({ timetableId: 1, dayOfWeek: 1, timeSlotId: 1 }, { unique: true });
timetableEntrySchema.index({ teacherId: 1, dayOfWeek: 1, timeSlotId: 1 });

export const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);
export const Timetable = mongoose.model("Timetable", timetableSchema);
export const TimetableEntry = mongoose.model("TimetableEntry", timetableEntrySchema);
export { DAYS_OF_WEEK };
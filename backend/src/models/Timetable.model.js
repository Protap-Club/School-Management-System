import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════════
// TimeSlot Schema - School defines time periods (Period 1..N)
// ═══════════════════════════════════════════════════════════════

const timeSlotSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true
        },
        slotNumber: {
            type: Number,
            required: [true, "Slot number is required"]
        },
        startTime: {
            type: String,
            required: [true, "Start time is required"]
        },
        endTime: {
            type: String,
            required: [true, "End time is required"]
        },
        slotType: {
            type: String,
            enum: ["CLASS", "BREAK"],
            default: "CLASS"
        },
        label: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Unique: One slot number per school
timeSlotSchema.index({ schoolId: 1, slotNumber: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════
// Timetable Schema - One timetable per class+section+year per school
// ═══════════════════════════════════════════════════════════════

const timetableSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true
        },
        standard: {
            type: String,
            required: [true, "Standard is required"],
            trim: true
        },
        section: {
            type: String,
            required: [true, "Section is required"],
            trim: true
        },
        academicYear: {
            type: Number,
            required: [true, "Academic year is required"]
        },
        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED"],
            default: "DRAFT"
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Unique: One timetable per class+section+year per school
timetableSchema.index(
    { schoolId: 1, standard: 1, section: 1, academicYear: 1 },
    { unique: true }
);

// ═══════════════════════════════════════════════════════════════
// TimetableEntry Schema - Actual mapping (day + slot) → subject + teacher
// ═══════════════════════════════════════════════════════════════

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timetableEntrySchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true
        },
        timetableId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Timetable",
            required: true,
            index: true
        },
        dayOfWeek: {
            type: String,
            enum: DAYS_OF_WEEK,
            required: [true, "Day of week is required"]
        },
        timeSlotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TimeSlot",
            required: true,
            index: true
        },
        // For CLASS slots (required)
        subject: {
            type: String,
            trim: true
        },
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        // Optional fields
        roomNumber: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Rule A: Unique per timetable cell (one class cannot have two entries in same slot/day)
timetableEntrySchema.index(
    { timetableId: 1, dayOfWeek: 1, timeSlotId: 1 },
    { unique: true }
);

// Rule B: Teacher conflict detection index
timetableEntrySchema.index(
    { teacherId: 1, dayOfWeek: 1, timeSlotId: 1, isActive: 1 }
);

// ═══════════════════════════════════════════════════════════════
// Export Models
// ═══════════════════════════════════════════════════════════════

export const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);
export const Timetable = mongoose.model("Timetable", timetableSchema);
export const TimetableEntry = mongoose.model("TimetableEntry", timetableEntrySchema);

// Export constants for use in validation
export { DAYS_OF_WEEK };

import mongoose from "mongoose";

// Subject Schema 
const subjectSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: { type: String, trim: true, uppercase: true },
    subjectType: {
      type: String,
      enum: ["THEORY", "PRACTICAL", "LAB", "EXTRACURRICULAR"],
      default: "THEORY",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });

// TimeSlot Schema 
const timeSlotSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    slotNumber: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotType: { type: String, enum: ["CLASS", "BREAK"], default: "CLASS" },
    label: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timeSlotSchema.index({ schoolId: 1, slotNumber: 1 }, { unique: true });

// Timetable Schema 
const timetableSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    standard: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    academicYear: { type: Number, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timetableSchema.index(
  { schoolId: 1, standard: 1, section: 1, academicYear: 1 },
  { unique: true }
);

// TimetableEntry Schema 
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timetableEntrySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    timetableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timetable",
      required: true,
      index: true,
    },
    dayOfWeek: { type: String, enum: DAYS_OF_WEEK, required: true },
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
    // Subject as string (simpler than ObjectId reference)
    subject: {
      type: String,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    roomNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timetableEntrySchema.index(
  { timetableId: 1, dayOfWeek: 1, timeSlotId: 1 },
  { unique: true }
);
timetableEntrySchema.index({ teacherId: 1, dayOfWeek: 1, timeSlotId: 1, isActive: 1 });

// Exports 
export const Subject = mongoose.model("Subject", subjectSchema);
export const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);
export const Timetable = mongoose.model("Timetable", timetableSchema);
export const TimetableEntry = mongoose.model("TimetableEntry", timetableEntrySchema);
export { DAYS_OF_WEEK };
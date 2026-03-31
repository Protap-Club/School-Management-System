import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true
        },
        date: {
            type: Date,
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["Present", "Absent"],
            default: "Present"
        },
        checkInTime: { type: Date },
        markedBy: {
            type: String,
            enum: ["NFC", "Manual"],
            default: "NFC"
        },
        // Tracks which teacher/admin manually marked the record (null for NFC)
        markedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        remarks: { type: String, trim: true }
    },
    { timestamps: true }
);

// Compound index: One attendance record per student per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Dashboard/today query: filter by school + date (getTodayAttendance, stats endpoint)
attendanceSchema.index({ schoolId: 1, date: 1 });

export default mongoose.model("Attendance", attendanceSchema);

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
            enum: ["Present", "Absent", "Late"],
            default: "Present"
        },
        checkInTime: { type: Date },
        markedBy: {
            type: String,
            enum: ["NFC", "Manual"],
            default: "NFC"
        },
        remarks: { type: String, trim: true }
    },
    { timestamps: true }
);

// Compound index: One attendance record per student per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);

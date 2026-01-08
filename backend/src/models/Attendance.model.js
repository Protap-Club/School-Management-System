import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        instituteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Institute",
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
            enum: ["present", "absent", "late"],
            required: true
        },

        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        remarks: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Compound index for efficient queries
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ instituteId: 1, date: 1 });

export default mongoose.model("Attendance", attendanceSchema);

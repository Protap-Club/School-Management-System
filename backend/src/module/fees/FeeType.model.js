import mongoose from "mongoose";

const feeTypeSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        name: {
            type: String, // Unique identifier like TUITION, EXAM or custom
            required: true,
            trim: true,
            uppercase: true,
        },
        label: {
            type: String, // Display name like "Tuition", "Exam" or custom
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ["FEE", "PENALTY"],
            default: "FEE",
            index: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true, id: false }
);

// One name per school
feeTypeSchema.index({ schoolId: 1, name: 1 }, { unique: true });

export const FeeType = mongoose.model("FeeType", feeTypeSchema);

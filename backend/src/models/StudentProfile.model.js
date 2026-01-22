import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
        schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
        rollNumber: { type: String, required: true, trim: true },
        standard: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        section: { type: String, trim: true },
        guardianName: { type: String, trim: true },
        guardianContact: { type: String, trim: true },
        address: { type: String, trim: true },
        admissionDate: { type: Date }
    },
    { timestamps: true }
);

// Ensure roll number is unique within a specific class (standard + section) of a school
studentProfileSchema.index({ schoolId: 1, standard: 1, section: 1, rollNumber: 1 }, { unique: true });


export default mongoose.model("StudentProfile", studentProfileSchema);

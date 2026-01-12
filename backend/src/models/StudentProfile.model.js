import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
        rollNumber: { type: String, required: true, trim: true },
        course: { type: String, required: true, trim: true },
        year: { type: Number, required: true },
        section: { type: String, trim: true },
        guardianName: { type: String, trim: true },
        guardianContact: { type: String, trim: true },
        address: { type: String, trim: true },
        admissionDate: { type: Date }
    },
    { timestamps: true }
);

export default mongoose.model("StudentProfile", studentProfileSchema);

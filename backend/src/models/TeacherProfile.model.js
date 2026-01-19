import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
        employeeId: { type: String, trim: true },
        standard: { type: String, required: true, trim: true }, // e.g., "9th", "10th"
        section: { type: String, required: true, trim: true },  // e.g., "A", "B"
        qualification: { type: String, trim: true },
        joiningDate: { type: Date }
    },
    { timestamps: true }
);

export default mongoose.model("TeacherProfile", teacherProfileSchema);


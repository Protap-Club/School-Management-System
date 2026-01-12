import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
        employeeId: { type: String, trim: true },
        department: { type: String, required: true, trim: true },
        designation: { type: String, required: true, trim: true },
        qualification: { type: String, trim: true },
        joiningDate: { type: Date }
    },
    { timestamps: true }
);

export default mongoose.model("TeacherProfile", teacherProfileSchema);

import mongoose from "mongoose";
import { VALID_ROLES } from "../constants/userRoles.js";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        password: { type: String, required: true, select: false },
        role: { type: String, enum: VALID_ROLES, required: true, index: true },
        schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", index: true },
        contactNo: { type: String, trim: true },
        isEmailVerified: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        isArchived: { type: Boolean, default: false, index: true },
        archivedAt: { type: Date },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        mustChangePassword: { type: Boolean, default: true },
        lastLoginAt: { type: Date },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);

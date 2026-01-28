import mongoose from "mongoose";
import { VALID_ROLES } from "../constants/userRoles.js";

const userSchema = new mongoose.Schema(
  {
    // Identity & Access 
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Security: Never returns password in queries by default
    },
    role: {
      type: String,
      enum: VALID_ROLES,
      required: true,
      index: true,
    },

    // Organization & Hardware 
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    nfcUid: {
      type: String,
      unique: true,
      sparse: true, // Allows users without tags yet to have a null value
      trim: true,
      index: true,
    },

    // Contact & Profile 
    contactNo: {
      type: String,
      trim: true,
    },
    avatarUrl: { 
      type: String, 
      trim: true 
    }, // Optional: Useful for UI/Profiles

    // Status & Security 
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },

    // Archive & Audit Trail 
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

//  Virtuals 
// Links User to their specific profile based on role
userSchema.virtual("studentProfile", {
  ref: "StudentProfile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("teacherProfile", {
  ref: "TeacherProfile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

export default mongoose.model("User", userSchema);
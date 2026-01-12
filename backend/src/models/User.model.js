import mongoose from "mongoose";
import { VALID_ROLES } from "../constants/userRoles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: VALID_ROLES,
      required: true,
      index: true
    },

    // Institute this user belongs to (required for admin, teacher, student)
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      index: true
      // Not required for super_admin
    },

    contactNo: {
      type: String,
      trim: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    mustChangePassword: {
      type: Boolean,
      default: true
    },

    lastLoginAt: {
      type: Date
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);

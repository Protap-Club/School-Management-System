import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { USER_ROLES } from "../../../constants/userRoles.js";

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
      enum: Object.values(USER_ROLES),
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      select: false
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
      trim: true,
    },
    avatarPublicId: {
      type: String,
      trim: true,
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
  { timestamps: true, id: false },
);

// Compound index: covers the most common query pattern — fetch all users of a
// given role in a school (attendance, users page, teacher lists, etc.)
// { isArchived } is appended because queries almost always filter out archived users.
userSchema.index({ schoolId: 1, role: 1, isArchived: 1 });

// Hooks
// Hash password before saving if it's new or modified
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Methods
// Method to compare candidate password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

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

userSchema.virtual("adminProfile", {
  ref: "AdminProfile",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

export default mongoose.model("User", userSchema);

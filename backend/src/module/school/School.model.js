import mongoose from "mongoose";

const classSectionSchema = new mongoose.Schema(
  {
    standard: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    subjects: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Subject name cannot exceed 100 characters"],
      },
    ],
  },
  { _id: false }
);

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
      index: "text",
    },
    code: {
      type: String,
      required: [true, "School code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    logoPublicId: {
      type: String,
      trim: true,
    },
    theme: {
      accentColor: {
        type: String,
        default: "#2563eb",
      },
    },
    academic: {
      classSections: {
        type: [classSectionSchema],
        default: [],
      },
    },

    // Feature toggle modules
    features: {
      attendance: { type: Boolean, default: false },
      fees: { type: Boolean, default: false },
      timetable: { type: Boolean, default: false },
      library: { type: Boolean, default: false },
      transport: { type: Boolean, default: false },
      notice: { type: Boolean, default: false },
      calendar: { type: Boolean, default: false },
      examination: { type: Boolean, default: false },
      assignment: { type: Boolean, default: false },
      result: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

// Count Admins
schoolSchema.virtual("adminCount", {
  ref: "User",
  localField: "_id",
  foreignField: "schoolId",
  count: true,
  match: { role: "admin", isArchived: { $ne: true } },
});

// Count Teachers
schoolSchema.virtual("teacherCount", {
  ref: "User",
  localField: "_id",
  foreignField: "schoolId",
  count: true,
  match: { role: "teacher", isArchived: { $ne: true } },
});

// Count Students
schoolSchema.virtual("studentCount", {
  ref: "User",
  localField: "_id",
  foreignField: "schoolId",
  count: true,
  match: { role: "student", isArchived: { $ne: true } },
});

export default mongoose.model("School", schoolSchema);

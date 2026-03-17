import mongoose from "mongoose";

// Reusable sub-schema for Cloudinary file references
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

// Assignment Schema
const assignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    standard: {
      type: String,
      required: [true, "Standard is required"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Compound index for listing assignments per school by class
assignmentSchema.index({ schoolId: 1, standard: 1, section: 1, createdAt: -1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);

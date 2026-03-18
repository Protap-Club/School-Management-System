import mongoose from "mongoose";

// Reusable sub-schema for Cloudinary file references
const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String },
    fileType: { type: String },
  },
  { _id: false }
);

// Submission Schema
const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    files: {
      type: [fileSchema],
      required: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One submission per student per assignment (upsert pattern used in service)
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const Submission = mongoose.model("Submission", submissionSchema);

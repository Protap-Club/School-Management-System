import mongoose from "mongoose";

// Notice Schema
const noticeSchema = new mongoose.Schema(
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
      trim: true,
      default: "",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["notice", "file"],
      default: "notice",
    },
    recipientType: {
      type: String,
      enum: ["all", "classes", "users", "students", "groups"],
      required: [true, "Recipient type is required"],
    },
    recipients: {
      type: [String],
      default: [],
    },
    attachment: {
      filename: { type: String },
      originalName: { type: String },
      path: { type: String },
      size: { type: Number },
      mimetype: { type: String },
      secure_url: { type: String },
      public_id: { type: String },
    },
    status: {
      type: String,
      enum: ["sent", "draft"],
      default: "sent",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index for listing notices per school
noticeSchema.index({ schoolId: 1, isActive: 1, createdAt: -1 });

// NoticeGroup Schema
const noticeGroupSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure unique group names per user per school
noticeGroupSchema.index(
  { schoolId: 1, createdBy: 1, name: 1 },
  { unique: true }
);

// Exports
export const Notice = mongoose.model("Notice", noticeSchema);
export const NoticeGroup = mongoose.model("NoticeGroup", noticeGroupSchema);

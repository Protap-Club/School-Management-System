import mongoose from "mongoose";

const noticeAttachmentSchema = new mongoose.Schema(
  {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    secure_url: { type: String },
    public_id: { type: String },
    label: { type: String },
  },
  { _id: false, id: false }
);

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
      type: noticeAttachmentSchema,
      default: null,
    },
    attachments: {
      type: [noticeAttachmentSchema],
      default: [],
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
    hiddenFor: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    requiresAcknowledgment: {
      type: Boolean,
      default: false,
    },
    acknowledgments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        responseMessage: {
          type: String,
          trim: true,
          default: '',
          maxlength: 500,
        },
        attachments: {
          type: [noticeAttachmentSchema],
          default: [],
        },
      },
    ],
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

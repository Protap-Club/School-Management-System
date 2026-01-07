import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      trim: true
    },

    schoolCode: {
      type: String,
      trim: true
    },

    logoUrl: {
      type: String,
      trim: true
    },

    address: {
      type: String,
      trim: true
    },

    contactEmail: {
      type: String,
      lowercase: true,
      trim: true
    },

    contactPhone: {
      type: String,
      trim: true
    },

    welcomeMessage: {
      type: String,
      trim: true
    },

    academicYear: {
      type: String,
      trim: true
    },

    theme: {
      mode: {
        type: String,
        enum: ["light", "dark"],
        default: "light"
      },
      accentColor: {
        type: String,
        default: "#2563eb"
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Settings", settingsSchema);

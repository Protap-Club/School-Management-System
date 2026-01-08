import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    logoUrl: {
      type: String,
      trim: true,
      default: ""
    },

    theme: {
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


import mongoose from "mongoose";

const adminProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },

    permissions: {
      type: [String],
      default: []
    },

    department: {
      type: String,
      trim: true
    },

    employeeId: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("AdminProfile", adminProfileSchema);

import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    // Core Relationships 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // Academic Details 
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    standard: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    admissionDate: {
      type: Date,
    },

    // Guardian & Personal Info 
    // Parent Info 
    fatherName: {
      type: String,
      trim: true,
    },
    fatherContact: {
      type: String,
      trim: true,
    },
    motherName: {
      type: String,
      trim: true,
    },
    motherContact: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes 

// Ensure roll number is unique within a specific class (standard + section) of a school
// Example: You can't have two students with Roll No "10" in "Class 10-A" at "School X"
studentProfileSchema.index(
  { schoolId: 1, standard: 1, section: 1, rollNumber: 1 },
  { unique: true }
);

export default mongoose.model("StudentProfile", studentProfileSchema);
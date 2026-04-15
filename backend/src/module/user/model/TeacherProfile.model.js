import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
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
      index: true,  // Optimized for "Get all teachers in this school"
    },

    // Employment Details 
    employeeId: {
      type: String,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
    },

    // Academic Responsibilities
    classTeacherOf: {
      standard: { type: String, trim: true },
      section: { type: String, trim: true },
    },
    // Example: [{ standard: "9th", section: "A", subjects: ["Math", "Physics"] }]
    assignedClasses: [
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
        },
        subjects: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],

    // Salary
    expectedSalary: {
      type: Number,
      min: [101, "Expected salary must be more than 100"],
      default: 15000,
    },
  },
  {
    timestamps: true,
    id: false,
  }
);

teacherProfileSchema.index(
  { schoolId: 1, 'classTeacherOf.standard': 1, 'classTeacherOf.section': 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("TeacherProfile", teacherProfileSchema);

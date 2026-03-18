import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        teacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: [true, "Month is required"],
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: [true, "Year is required"],
        },
        amount: {
            type: Number,
            required: [true, "Salary amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        status: {
            type: String,
            enum: ["PENDING", "PAID"],
            default: "PENDING",
        },
        paidDate: {
            type: Date,
        },
        remarks: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true, id: false }
);

// One salary record per teacher per month per year
salarySchema.index(
    { schoolId: 1, teacherId: 1, month: 1, year: 1 },
    { unique: true }
);

// Dashboard queries
salarySchema.index({ schoolId: 1, year: 1, status: 1 });
salarySchema.index({ schoolId: 1, teacherId: 1, year: 1 });

export default mongoose.model("Salary", salarySchema);

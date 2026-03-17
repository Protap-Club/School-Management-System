import mongoose from "mongoose";

const resultSubjectSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },
        maxMarks: {
            type: Number,
            required: [true, "Maximum marks is required"],
            min: [0, "Maximum marks cannot be negative"],
        },
        obtainedMarks: {
            type: Number,
            required: [true, "Obtained marks is required"],
            min: [0, "Obtained marks cannot be negative"],
        },
    },
    { _id: false, id: false }
);

const resultSchema = new mongoose.Schema(
    {
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        subjects: {
            type: [resultSubjectSchema],
            default: [],
        },
        totalMarks: {
            type: Number,
            required: true,
            min: [0, "Total marks cannot be negative"],
        },
        obtainedMarks: {
            type: Number,
            required: true,
            min: [0, "Obtained marks cannot be negative"],
        },
        percentage: {
            type: Number,
            required: true,
            min: [0, "Percentage cannot be negative"],
        },
        grade: {
            type: String,
            trim: true,
        },
        resultStatus: {
            type: String,
            enum: ["pass", "fail"],
            required: true,
        },
        promoted: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["draft", "published", "locked"],
            default: "draft",
        },
        publishedAt: {
            type: Date,
        },
        editableUntil: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true, id: false }
);

resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });
resultSchema.index({ schoolId: 1, examId: 1 });

const Result = mongoose.model("Result", resultSchema);

export default Result;

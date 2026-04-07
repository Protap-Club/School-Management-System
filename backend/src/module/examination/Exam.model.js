import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════════
// EXAM — Term exams (admin) and class tests (teacher)
// Schedule is embedded as a sub-document array.
// ═══════════════════════════════════════════════════════════════

const scheduleAttachmentSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true,
        },
        publicId: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        originalName: {
            type: String,
            trim: true,
        },
        fileType: {
            type: String,
            trim: true,
        },
        mimeType: {
            type: String,
            trim: true,
        },
        size: {
            type: Number,
            min: 0,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false, id: false }
);

const scheduleItemSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true,
        },
        examDate: {
            type: Date,
            required: [true, "Exam date is required"],
        },
        startTime: {
            type: String,
            trim: true,
        },
        endTime: {
            type: String,
            trim: true,
        },
        totalMarks: {
            type: Number,
            required: [true, "Total marks is required"],
            min: [1, "Total marks must be at least 1"],
        },
        passingMarks: {
            type: Number,
            min: [0, "Passing marks cannot be negative"],
            default: 0,
        },
        assignedTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        syllabus: {
            type: String,
            trim: true,
        },
        attachments: {
            type: [scheduleAttachmentSchema],
            default: [],
        },
    },
    { _id: true, id: false }
);

const syllabusDocumentSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true,
        },
        publicId: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
        },
        originalName: {
            type: String,
            trim: true,
        },
        fileType: {
            type: String,
            trim: true,
        },
        mimeType: {
            type: String,
            trim: true,
        },
        size: {
            type: Number,
            min: 0,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false, id: false }
);

const creatorSnapshotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["admin", "teacher", "super_admin"],
            required: true,
        },
        classLabel: {
            type: String,
            trim: true,
        },
    },
    { _id: false, id: false }
);

const examSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "Exam name is required"],
            trim: true,
        },
        examType: {
            type: String,
            enum: ["TERM_EXAM", "CLASS_TEST"],
            required: [true, "Exam type is required"],
        },
        category: {
            type: String,
            enum: ["MIDTERM","FINAL","SEMESTER","UNIT_TEST","CLASS_TEST","SURPRISE_TEST","WEEKLY_QUIZ","OTHER"],
            default: "OTHER",
        },
        // Optional explanation when category is set to "OTHER"
        categoryDescription: {
            type: String,
            trim: true,
        },
        academicYear: {
            type: Number,
            required: [true, "Academic year is required"],
        },
        standard: {
            type: String,
            required: [true, "Standard is required"],
            trim: true,
        },
        section: {
            type: String,
            required: [true, "Section is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        syllabusDocument: {
            type: syllabusDocumentSchema,
            default: null,
        },

        // Embedded schedule
        schedule: [scheduleItemSchema],

        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"],
            default: "DRAFT",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        createdByRole: {
            type: String,
            enum: ["admin", "teacher", "super_admin"],
            required: true,
        },
        creatorSnapshot: {
            type: creatorSnapshotSchema,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true, id: false }
);

// Prevent duplicate exams: same name + class + year + type
examSchema.index(
    { schoolId: 1, name: 1, academicYear: 1, standard: 1, section: 1, examType: 1 }
);

// Query optimization indexes
examSchema.index({ schoolId: 1, examType: 1, status: 1 });
examSchema.index({ schoolId: 1, standard: 1, section: 1, academicYear: 1 });
examSchema.index({ schoolId: 1, createdBy: 1 });

const Exam = mongoose.model("Exam", examSchema);

export default Exam;

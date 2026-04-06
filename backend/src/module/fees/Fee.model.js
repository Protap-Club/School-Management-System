import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════════
// FEE STRUCTURE — Configuration template set by Admin
// Defines what fees exist for a class (standard/section).
// ═══════════════════════════════════════════════════════════════

const feeStructureSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
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

        // Fee details
        feeType: {
            type: String,
            required: [true, "Fee type is required"],
        },
        name: {
            type: String,
            required: [true, "Fee name is required"],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0, "Amount cannot be negative"],
        },

        // Schedule
        frequency: {
            type: String,
            enum: ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"],
            required: [true, "Frequency is required"],
        },
        dueDay: {
            type: Number,
            min: 1,
            max: 28,
            default: 10,
        },
        // Months when this fee applies (1-12). e.g. [4,5,6,7,8,9,10,11,12,1,2,3] for full year
        applicableMonths: [
            {
                type: Number,
                min: 1,
                max: 12,
            },
        ],

        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true, id: false }
);

// One fee type per class per year
feeStructureSchema.index(
    { schoolId: 1, academicYear: 1, standard: 1, section: 1, feeType: 1 },
    { unique: true }
);

// ═══════════════════════════════════════════════════════════════
// FEE ASSIGNMENT — Per-student, per-month fee record
// Generated from FeeStructure for each student in the class.
// ═══════════════════════════════════════════════════════════════

const feeAssignmentSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FeeStructure",
            required: true,
            index: true,
        },

        academicYear: {
            type: Number,
            required: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },

        // Financials
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        netAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED"],
            default: "PENDING",
        },
        dueDate: {
            type: Date,
            required: true,
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

// One assignment per student per fee per month
feeAssignmentSchema.index(
    { schoolId: 1, studentId: 1, feeStructureId: 1, academicYear: 1, month: 1 },
    { unique: true }
);
// Dashboard queries
feeAssignmentSchema.index({ schoolId: 1, academicYear: 1, month: 1, status: 1 });
feeAssignmentSchema.index({ schoolId: 1, studentId: 1, academicYear: 1 });

// ═══════════════════════════════════════════════════════════════
// FEE PAYMENT — Individual payment transaction record
// ═══════════════════════════════════════════════════════════════

const feePaymentSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        feeAssignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FeeAssignment",
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        amount: {
            type: Number,
            required: [true, "Payment amount is required"],
            min: [1, "Payment must be at least 1"],
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        paymentMode: {
            type: String,
            enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE"],
            required: [true, "Payment mode is required"],
        },
        transactionRef: {
            type: String,
            trim: true,
        },

        receiptNumber: {
            type: String,
            unique: true,
            required: true,
        },
        remarks: {
            type: String,
            trim: true,
        },

        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true, id: false }
);

feePaymentSchema.index({ schoolId: 1, studentId: 1, paymentDate: -1 });

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);
export const FeeAssignment = mongoose.model("FeeAssignment", feeAssignmentSchema);
export const FeePayment = mongoose.model("FeePayment", feePaymentSchema);

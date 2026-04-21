import mongoose from "mongoose";

/**
 * PROXY REQUEST MODEL
 * 
 * Represents a request by a teacher to be unavailable for a specific class slot.
 * Created when a teacher marks themselves unavailable from their timetable view.
 */
const proxyRequestSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    // The original teacher who is unavailable
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    // Class information
    standard: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true
    },
    // Subject being taught
    subject: {
        type: String,
        trim: true
    },
    // Date of the absence
    date: {
        type: Date,
        required: true,
        index: true
    },
    // Time slot information
    dayOfWeek: {
        type: String,
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        required: true
    },
    timeSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot",
        required: true
    },
    slotNumber: {
        type: Number,
        required: true
    },
    // Request status
    status: {
        type: String,
        enum: ["pending", "resolved", "cancelled"],
        default: "pending"
    },
    // Optional reason for unavailability
    reason: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // When the request was resolved
    resolvedAt: {
        type: Date
    },
    // Reference to the proxy assignment when resolved
    proxyAssignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProxyAssignment"
    }
}, { timestamps: true });

// Compound indexes for efficient querying
proxyRequestSchema.index({ schoolId: 1, status: 1, date: 1 });
proxyRequestSchema.index({ schoolId: 1, teacherId: 1, date: 1 });
proxyRequestSchema.index({ schoolId: 1, standard: 1, section: 1, date: 1, dayOfWeek: 1, slotNumber: 1 });

/**
 * PROXY ASSIGNMENT MODEL
 * 
 * Represents the actual proxy/fill-in arrangement.
 * Created by admin to assign a proxy teacher or mark as free period.
 */
const proxyAssignmentSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    // Reference to the original request (optional for admin-created assignments)
    proxyRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProxyRequest"
    },
    // The original teacher who is unavailable
    originalTeacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // The proxy teacher (null if marked as free period)
    proxyTeacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    // Type of assignment
    type: {
        type: String,
        enum: ["proxy", "free_period"],
        required: true
    },
    // Class information
    standard: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        trim: true
    },
    // Date of the assignment
    date: {
        type: Date,
        required: true,
        index: true
    },
    // Time slot information
    dayOfWeek: {
        type: String,
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        required: true
    },
    timeSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeSlot",
        required: true
    },
    slotNumber: {
        type: Number,
        required: true
    },
    // Admin who created the assignment
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Optional notes
    notes: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Whether this assignment is active
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound indexes for efficient querying
proxyAssignmentSchema.index({ schoolId: 1, date: 1, isActive: 1 });
proxyAssignmentSchema.index({ schoolId: 1, proxyTeacherId: 1, date: 1, isActive: 1 });
proxyAssignmentSchema.index({ schoolId: 1, standard: 1, section: 1, date: 1, dayOfWeek: 1, slotNumber: 1 });

export const ProxyRequest = mongoose.model("ProxyRequest", proxyRequestSchema);
export const ProxyAssignment = mongoose.model("ProxyAssignment", proxyAssignmentSchema);

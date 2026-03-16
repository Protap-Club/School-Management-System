import mongoose from "mongoose";

const CalendarEventSchema = new mongoose.Schema({
    // 'title' is what shows up on the calendar bar
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    // Start date/time (ISO 8601 format)
    start: {
        type: Date,
        required: [true, 'Please add a start date']
    },
    // End date/time
    end: {
        type: Date,
        required: [true, 'Please add an end date']
    },
    // Check if it's a full-day event (like a holiday) or a timed event (like an exam 10AM-12PM)
    allDay: {
        type: Boolean,
        default: true
    },
    // Event type: national (holidays), exam, custom, event
    // Colors: national=Green, exam=Blue, custom=Yellow, event=Purple
    type: {
        type: String,
        enum: ['national', 'exam', 'custom', 'event'],
        default: 'event'
    },
    // Who can see this event?
    // 'all' = everyone in the school (backward-compatible default)
    // 'classes' = only specific classes listed in targetClasses
    targetAudience: {
        type: String,
        enum: ['all', 'classes'],
        default: 'all'
    },
    // Targeted class strings e.g. ["10-A", "11-B"] (standard + '-' + section)
    targetClasses: {
        type: [String],
        default: []
    },
    // Add specific details for the admin panel
    description: {
        type: String
    },
    // Who created this?
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Associated school
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School'
    },
    // Optional linkage for system-generated events (e.g., exams)
    sourceType: {
        type: String,
        enum: ['exam'],
        required: false
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    }
}, { timestamps: true });

// Validations to ensure start date is before end date
CalendarEventSchema.pre('validate', function () {
    if (this.start && this.end && this.start > this.end) {
        this.invalidate('end', 'End date must be greater than or equal to Start date');
    }
});

// Index for efficient date range queries
CalendarEventSchema.index({ start: 1, end: 1 });
CalendarEventSchema.index({ schoolId: 1 });
CalendarEventSchema.index({ sourceType: 1, sourceId: 1 });
// Index for efficient audience-based filtering
CalendarEventSchema.index({ schoolId: 1, targetAudience: 1 });
// Index for date ranges within a school
CalendarEventSchema.index({ schoolId: 1, start: 1, end: 1 });

export const CalendarEvent = mongoose.model('CalendarEvent', CalendarEventSchema);

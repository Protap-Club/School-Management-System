import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
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
  // Category helps you color-code on the frontend (e.g., Holidays = Red, Exams = Yellow)
  category: {
    type: String,
    enum: ['holiday', 'exam', 'meeting', 'event'],
    default: 'event'
  },
  // Add specific details for the admin panel
  description: {
    type: String
  },
  // Who created this?
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Validations to ensure start date is before end date
EventSchema.pre('validate', function(next) {
  if (this.start > this.end) {
    next(new Error('End date must be greater than or equal to Start date'));
  } else {
    next();
  }
});

export const eventModel = mongoose.model('Event', EventSchema);
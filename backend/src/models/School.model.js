import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "School name is required"], trim: true, index: 'text' },
        code: { type: String, required: [true, "School code is required"], unique: true, uppercase: true, trim: true },
        address: { type: String, trim: true },
        contactEmail: { type: String, lowercase: true, trim: true },
        contactPhone: { type: String, trim: true },
        logoUrl: { type: String, trim: true },
        theme: {
            accentColor: { type: String, default: "#2563eb" }
        },
        features: {
            attendance: { type: Boolean, default: false },
            fees: { type: Boolean, default: false },
            timetable: { type: Boolean, default: false },
            library: { type: Boolean, default: false },
            transport: { type: Boolean, default: false },
            notice: { type: Boolean, default: false }
        },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// User count virtuals
schoolSchema.virtual('adminCount', {
    ref: 'User', localField: '_id', foreignField: 'schoolId', count: true, match: { role: 'admin' }
});

schoolSchema.virtual('teacherCount', {
    ref: 'User', localField: '_id', foreignField: 'schoolId', count: true, match: { role: 'teacher' }
});

schoolSchema.virtual('studentCount', {
    ref: 'User', localField: '_id', foreignField: 'schoolId', count: true, match: { role: 'student' }
});

export default mongoose.model("School", schoolSchema);

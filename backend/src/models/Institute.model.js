import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
    {
        name: { type: String, required: [true, "Institute name is required"], trim: true },
        code: { type: String, required: [true, "Institute code is required"], unique: true, uppercase: true, trim: true },
        address: { type: String, trim: true },
        contactEmail: { type: String, lowercase: true, trim: true },
        contactPhone: { type: String, trim: true },
        logoUrl: { type: String, trim: true },
        theme: {
            accentColor: { type: String, default: "#2563eb" }
        },
        features: {
            attendance: { enabled: { type: Boolean, default: false } }
        },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// User count virtuals
instituteSchema.virtual('adminCount', {
    ref: 'User', localField: '_id', foreignField: 'instituteId', count: true, match: { role: 'admin' }
});

instituteSchema.virtual('teacherCount', {
    ref: 'User', localField: '_id', foreignField: 'instituteId', count: true, match: { role: 'teacher' }
});

instituteSchema.virtual('studentCount', {
    ref: 'User', localField: '_id', foreignField: 'instituteId', count: true, match: { role: 'student' }
});

export default mongoose.model("Institute", instituteSchema);

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null, // null for super_admin platform actions
        index: true
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    actorRole: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        index: true
    },
    targetModel: {
        type: String, // e.g. 'User', 'Examination', etc.
        required: false
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId, // The affected document _id
        required: false
    },
    description: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false // "Chrome / Windows" truncated format
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 180 * 24 * 60 * 60 // 180 days TTL: auto-deleted
    }
}, {
    timestamps: false // We only need createdAt, TTL index uses it
});

// Create compound index for efficient fetching by school and actor, or descending chronological sort
auditLogSchema.index({ schoolId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

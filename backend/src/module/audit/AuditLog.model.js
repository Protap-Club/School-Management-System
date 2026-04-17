import mongoose from 'mongoose';
import { ACTION_TYPES, SEVERITY_LEVELS, OUTCOME_VALUES } from '../../constants/auditActions.js';

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
    // ── New structured fields ──────────────────────────────────────────
    /** Verb-level category for the action (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, BROADCAST). */
    action_type: {
        type: String,
        enum: Object.values(ACTION_TYPES),
        required: false,
        index: true
    },
    /** Operational severity derived from action_type (LOW, MEDIUM, HIGH). */
    severity: {
        type: String,
        enum: Object.values(SEVERITY_LEVELS),
        required: false
    },
    /** Whether the action succeeded or failed (SUCCESS, FAILED). */
    outcome: {
        type: String,
        enum: Object.values(OUTCOME_VALUES),
        default: OUTCOME_VALUES.SUCCESS,
        required: false
    },
    /**
     * Short session identifier (hex hash).
     * Shown on row expansion / hover in the UI; never required.
     */
    session_id: {
        type: String,
        required: false
    },
    // ── Existing fields ────────────────────────────────────────────────
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
    /**
     * Freeform metadata bag.
     * For UPDATE actions, callers may include a `changes` array:
     *   [{ field: String, before: any, after: any }]
     * This powers the diff table in the expanded row UI.
     */
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

// Chronological fetch by school (primary query pattern)
auditLogSchema.index({ schoolId: 1, createdAt: -1 });
// Filtered fetch by type/severity inside a school
auditLogSchema.index({ schoolId: 1, action_type: 1, severity: 1, outcome: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);


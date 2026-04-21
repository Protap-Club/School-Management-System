import mongoose from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: false,
        sparse: true,
        index: true
    },
    otpHash: {
        type: String,
        required: false,
        index: true
    },
    otpAttempts: {
        type: Number,
        default: 0
    },
    otpLockedUntil: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    consumedAt: {
        type: Date,
        default: null
    },
    metadata: {
        userAgent: String,
        ip: String,
    }
}, {
    timestamps: true
});

// Automatically remove expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });

export default mongoose.model("PasswordResetToken", passwordResetTokenSchema);

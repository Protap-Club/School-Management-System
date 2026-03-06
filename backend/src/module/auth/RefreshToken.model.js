import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    replacedByTokenHash: {
        type: String, // To track rotation chain for security (reuse detection)
        index: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    metadata: {
        userAgent: String,
        ip: String,
        platform: {
            type: String,
            enum: ['web', 'mobile'],
            default: 'web'
        }
    }
}, {
    timestamps: true
});

// Automatically remove expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RefreshToken", refreshTokenSchema);

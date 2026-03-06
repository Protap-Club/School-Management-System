import jwt from "jsonwebtoken";
import crypto from "crypto";
import { conf } from "../config/index.js";
import User from "../module/user/model/User.model.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Create a short-lived access token (15 min).
export const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, schoolId: user.schoolId?._id || user.schoolId },
        conf.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

// Create a long-lived refresh token (7 days) — opaque random string, NOT a JWT.
export const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString("hex");
};

// Hash a refresh token before storing it in the DB.
export const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};

// Store refresh token hash + expiry on the user document.
// Moves current token to 'previous' to support a short grace period during rotation.
export const saveRefreshTokenToUser = async (userId, refreshToken) => {
    const user = await User.findById(userId).select("+refreshTokenHash +refreshTokenExpiresAt");
    
    const newHash = hashToken(refreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const updateData = {
        refreshTokenHash: newHash,
        refreshTokenExpiresAt: newExpiresAt
    };

    // If there was a current token, move it to 'previous'
    if (user && user.refreshTokenHash) {
        updateData.previousRefreshTokenHash = user.refreshTokenHash;
        updateData.previousRefreshTokenExpiresAt = user.refreshTokenExpiresAt;
    }

    await User.updateOne({ _id: userId }, { $set: updateData });
};

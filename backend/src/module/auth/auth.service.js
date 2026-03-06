import bcrypt from "bcryptjs";
import User from "../user/model/User.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError
} from "../../utils/customError.js";
import logger from "../../config/logger.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    saveRefreshToken
} from "../../utils/token.util.js";
import RefreshToken from "./RefreshToken.model.js";

// Public service functions 

// LOGIN
export const login = async (email, password, platform, metadata = {}) => {
    logger.info("Login attempt", { email, platform });
    
    if (!email || !password) throw new BadRequestError("Email and password are required");

    const user = await User.findOne({ email })
        .select("+password")
        .populate("schoolId", "name code");

    if (!user) {
        logger.warn("Login failed: User not found", { email, platform });
        throw new UnauthorizedError("Invalid credentials");
    }

    // Check account status
    if (!user.isActive) {
        logger.warn("Login failed: Account deactivated", { email, platform, role: user.role });
        throw new ForbiddenError("Account is deactivated");
    }

    // Platform-specific restrictions
    if (platform === 'web') {
        if (user.role === USER_ROLES.STUDENT) {
            throw new ForbiddenError("Access denied for students");
        }
    } else if (platform === 'mobile') {
        if (![USER_ROLES.STUDENT, USER_ROLES.TEACHER].includes(user.role)) {
            throw new ForbiddenError("Only students and teachers can access the mobile app");
        }
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logger.warn("Login failed: Invalid password", { email, platform, role: user.role });
        throw new UnauthorizedError("Invalid credentials");
    }

    // Update login time
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store in new RefreshToken collection
    await saveRefreshToken(user._id, refreshToken, { ...metadata, platform });

    const userResponse = {
        name: user.name,
        userid: user._id,
        schoolId: user.schoolId?._id,
        schoolName: user.schoolId?.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
    };

    return { user: userResponse, accessToken, refreshToken };
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (oldRefreshToken, metadata = {}) => {
    if (!oldRefreshToken) throw new UnauthorizedError("Refresh token is required");

    const oldHash = hashToken(oldRefreshToken);

    // 1. Find the token. We allow tokens that were replaced VERY recently (grace period)
    const tokenDoc = await RefreshToken.findOne({ 
        tokenHash: oldHash,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).populate({
        path: "userId",
        populate: { path: "schoolId", select: "name code" }
    });

    if (!tokenDoc) {
        // Reuse detection: If this token was already replaced by another, check if it was recent
        const replacedToken = await RefreshToken.findOne({ replacedByTokenHash: oldHash });
        if (replacedToken) {
            logger.warn("Refresh token reuse attempted", { oldHash: oldHash.substring(0, 8) });
        }
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = tokenDoc.userId;
    if (!user || !user.isActive) {
        throw new UnauthorizedError("User is no longer active");
    }

    // 2. Token Rotation with Grace Period
    // If this token was already replaced, but within the last 60 seconds, reuse the replacement or just allow one more refresh.
    // To handle concurrent requests, we check if it's already "being replaced".
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);

    // Update old token to indicate it was rotated
    // We don't delete it immediately to allow concurrent requests still using it for a few seconds.
    await RefreshToken.updateOne(
        { _id: tokenDoc._id },
        { 
            $set: { 
                replacedByTokenHash: newHash,
                isRevoked: true ,
                expiresAt: new Date(Date.now() + 60 * 1000) // Keep for 60s for race conditions
            } 
        }
    );

    // Create the new token
    await saveRefreshToken(user._id, newRefreshToken, { ...tokenDoc.metadata, ...metadata });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// LOGOUT
export const logout = async (refreshToken) => {
    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await RefreshToken.deleteOne({ tokenHash });
    }
    return { message: "Logged out successfully" };
};
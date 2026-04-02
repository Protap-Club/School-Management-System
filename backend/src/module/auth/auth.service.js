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

    if (user.isArchived) {
        logger.warn("Login failed: Account archived", { email, platform, role: user.role });
        throw new ForbiddenError("Account has been archived. Contact your administrator.");
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
        avatarPublicId: user.avatarPublicId,
        updatedAt: user.updatedAt,
    };

    return { user: userResponse, accessToken, refreshToken };
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (oldRefreshToken, metadata = {}) => {
    if (!oldRefreshToken) throw new UnauthorizedError("Refresh token is required");

    const oldHash = hashToken(oldRefreshToken);

    const tokenDoc = await RefreshToken.findOne({
        tokenHash: oldHash,
    }).populate({
        path: "userId",
        populate: { path: "schoolId", select: "name code" }
    });

    if (!tokenDoc) {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (tokenDoc.expiresAt <= new Date()) {
        throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (tokenDoc.isRevoked) {
        logger.warn("Refresh token reuse attempted", {
            userId: tokenDoc.userId?._id || tokenDoc.userId,
            tokenHashPrefix: oldHash.substring(0, 8),
            platform: tokenDoc.metadata?.platform,
        });

        await RefreshToken.updateMany(
            { userId: tokenDoc.userId?._id || tokenDoc.userId, isRevoked: false },
            { $set: { isRevoked: true, expiresAt: new Date() } }
        );

        throw new UnauthorizedError("Refresh token has been revoked");
    }

    const user = tokenDoc.userId;
    if (!user || !user.isActive || user.isArchived) {
        throw new UnauthorizedError("User is no longer active");
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);

    await RefreshToken.updateOne(
        { _id: tokenDoc._id },
        { 
            $set: { 
                replacedByTokenHash: newHash,
                isRevoked: true
            } 
        }
    );

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

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
    saveRefreshTokenToUser
} from "../../utils/token.util.js";

// Public service functions 

// LOGIN
export const login = async (email, password, platform) => {
    logger.info("Login attempt", { email, platform });
    
    if (!email || !password) throw new BadRequestError("Email and password are required");

    const user = await User.findOne({ email })
        .select("+password")
        .populate("schoolId", "name code");

    if (!user) {
        logger.warn("Login failed: User not found", { email, platform });
        throw new UnauthorizedError("Invalid credentials");
    }

    logger.info("User found", { email, role: user.role, isActive: user.isActive, platform });

    // Check account status
    if (!user.isActive) {
        logger.warn("Login failed: Account deactivated", { email, platform, role: user.role });
        throw new ForbiddenError("Account is deactivated");
    }

    // Restriction: Students cannot access the admin dashboard
    // if (user.role === USER_ROLES.STUDENT) throw new CustomError("Access denied for students", 403);

    // Platform-specific restrictions
    if (platform === 'web') {
        // Students cannot access the admin dashboard (WEB ONLY)
        if (user.role === USER_ROLES.STUDENT) {
            logger.warn("Login failed: Student access denied on web", { email, platform, role: user.role });
            throw new ForbiddenError("Access denied for students");
        }
    } else if (platform === 'mobile') {
        // Mobile-specific restrictions (if any)
        // For example: Only students and teachers allowed
        if (![USER_ROLES.STUDENT, USER_ROLES.TEACHER].includes(user.role)) {
            logger.warn("Login failed: Role not allowed on mobile", { email, platform, role: user.role });
            throw new ForbiddenError("Only students and teachers can access the mobile app");
        }
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logger.warn("Login failed: Invalid password", { email, platform, role: user.role });
        throw new UnauthorizedError("Invalid credentials");
    }

    // Update login time without triggering 'save' hooks
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store hashed refresh token on user document
    await saveRefreshTokenToUser(user._id, refreshToken);

    // Prepare clean response
    const userResponse = {
        name: user.name,
        userid: user._id,
        schoolId: user.schoolId?._id,
        schoolName: user.schoolId?.name,
        email: user.email,
        role: user.role,
    };

    logger.info("Login successful", userResponse);

    return { user: userResponse, accessToken, refreshToken };
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (oldRefreshToken) => {
    if (!oldRefreshToken) throw new UnauthorizedError("Refresh token is required");

    const oldHash = hashToken(oldRefreshToken);

    // Find user by the stored refresh token hash
    const user = await User.findOne({ refreshTokenHash: oldHash })
        .select("+refreshTokenHash +refreshTokenExpiresAt")
        .populate("schoolId", "name code");

    if (!user) {
        // Token not found — could be reuse after rotation. No user to clear, just reject.
        throw new UnauthorizedError("Invalid refresh token");
    }

    // Check expiry
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
        // Expired — clear stored token and reject
        await User.updateOne(
            { _id: user._id },
            { $unset: { refreshTokenHash: "", refreshTokenExpiresAt: "" } }
        );
        throw new UnauthorizedError("Refresh token has expired, please login again");
    }

    // Token Rotation 
    // Issue new tokens and invalidate the old one
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    await saveRefreshTokenToUser(user._id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// LOGOUT (server-side: clear refresh token)
export const logout = async (refreshToken) => {
    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        // Clear the refresh token fields for the matching user
        await User.updateOne(
            { refreshTokenHash: tokenHash },
            { $unset: { refreshTokenHash: "", refreshTokenExpiresAt: "" } }
        );
    }
    return { message: "Logged out successfully" };
};
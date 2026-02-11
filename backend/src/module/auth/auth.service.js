import bcrypt from "bcryptjs";
import User from "../user/model/User.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { CustomError } from "../../utils/customError.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    saveRefreshTokenToUser
} from "../../utils/token.util.js";

// Public service functions 

// LOGIN
export const login = async (email, password) => {
    if (!email || !password) throw new CustomError("Email and password are required", 400);

    const user = await User.findOne({ email })
        .select("+password")
        .populate("schoolId", "name code");

    if (!user) throw new CustomError("Invalid credentials", 401);

    // Check account status
    if (!user.isActive) throw new CustomError("Account is deactivated", 403);

    // Restriction: Students cannot access the admin dashboard
    if (user.role === USER_ROLES.STUDENT) throw new CustomError("Access denied for students", 403);

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new CustomError("Invalid credentials", 401);

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

    return { user: userResponse, accessToken, refreshToken };
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (oldRefreshToken) => {
    if (!oldRefreshToken) throw new CustomError("Refresh token is required", 401);

    const oldHash = hashToken(oldRefreshToken);

    // Find user by the stored refresh token hash
    const user = await User.findOne({ refreshTokenHash: oldHash })
        .select("+refreshTokenHash +refreshTokenExpiresAt")
        .populate("schoolId", "name code");

    if (!user) {
        // Token not found — could be reuse after rotation. No user to clear, just reject.
        throw new CustomError("Invalid refresh token", 401);
    }

    // Check expiry
    if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
        // Expired — clear stored token and reject
        await User.updateOne(
            { _id: user._id },
            { $unset: { refreshTokenHash: "", refreshTokenExpiresAt: "" } }
        );
        throw new CustomError("Refresh token has expired, please login again", 401);
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
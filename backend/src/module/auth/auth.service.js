import bcrypt from "bcryptjs";
import User from "../user/model/User.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { CustomError } from "../../utils/customError.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    compareToken,
} from "../../utils/token.util.js";

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

    // Update last login time (skip hooks)
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // Token payload
    const tokenPayload = { id: user._id, role: user.role, schoolId: user.schoolId?._id };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store hashed refresh token in DB
    const hashedRefresh = await hashToken(refreshToken);
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashedRefresh } });

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

    // Verify the JWT signature & expiry
    let decoded;
    try {
        decoded = verifyRefreshToken(oldRefreshToken);
    } catch {
        throw new CustomError("Invalid or expired refresh token", 401);
    }

    // Fetch user with the stored hashed refresh token
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user) throw new CustomError("User not found", 401);
    if (!user.refreshToken) throw new CustomError("No active session — please login", 401);

    // Compare the incoming token against stored hash
    const isValid = await compareToken(oldRefreshToken, user.refreshToken);
    if (!isValid) throw new CustomError("Refresh token has been revoked", 401);

    // Token rotation — issue new pair
    const tokenPayload = { id: user._id, role: user.role, schoolId: user.schoolId };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Save new hashed refresh token
    const hashedRefresh = await hashToken(newRefreshToken);
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashedRefresh } });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// LOGOUT 
export const logout = async (userId) => {
    // Invalidate refresh token in DB
    await User.updateOne({ _id: userId }, { $set: { refreshToken: null } });
    return { message: "Logged out successfully" };
};
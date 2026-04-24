import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { conf } from "../../config/index.js";
import logger from "../../config/logger.js";
import { UnauthorizedError } from "../../utils/customError.js";
import { getClientIp } from "../../utils/getClientIp.js";

// Shared cookie options for the refresh token
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,                                 // Not accessible via JS (XSS protection)
    secure: conf.NODE_ENV === "production",         // HTTPS only in production
    sameSite: "strict",                             // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,               // 7 days
    path: "/api/v1/auth",                           // Only sent to auth endpoints
};

// Handle user login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const platform = req.headers["x-platform"] === "mobile" ? "mobile" : "web";
    const metadata = {
        userAgent: req.headers["user-agent"],
        ip: getClientIp(req),
    };

    const result = await authService.login(email, password, platform, metadata);

    logger.info("Controller: Login successful, sending response", {
        email,
        platform,
        userId: result.user.userid,
        role: result.user.role
    });

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Return access token in JSON (frontend stores it in memory/localStorage)
    res.status(200).json({
        success: true,
        token: result.accessToken,
        user: result.user,
        ...(platform === "mobile" && { refreshToken: result.refreshToken }),
    });
});

// Refresh access token using the HttpOnly refresh cookie
export const refresh = async (req, res, next) => {
    try {
        // Mobile sends token in body (no cookie jar); web sends it as HttpOnly cookie
        const oldRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        const platform = req.headers["x-platform"] === "mobile" ? "mobile" : "web";

        if (!oldRefreshToken) {
            return res.status(200).json({ success: false, message: "Refresh token is missing" });
        }

        const metadata = {
            userAgent: req.headers["user-agent"],
            ip: getClientIp(req),
        };

        const result = await authService.refreshAccessToken(oldRefreshToken, metadata);

        // Set the new rotated refresh token cookie
        res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

        res.status(200).json({
            success: true,
            token: result.accessToken,
            ...(platform === "mobile" && { refreshToken: result.refreshToken }),
        });
    } catch (error) {
        // Suppress 401s for refresh to avoid browser console errors, return 200 with success: false
        if (error.statusCode === 401 || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(200).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Handle user logout — clears refresh token from DB and cookie
export const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const metadata = {
        userAgent: req.headers["user-agent"],
        ip: getClientIp(req),
    };

    await authService.logout(refreshToken, metadata);

    // Clear the refresh cookie
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: conf.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth",
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

// Check current authentication status
export const checkAuthStatus = (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
};

// Update password for users with system-generated passwords
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const result = await authService.updatePassword(userId, currentPassword, newPassword);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

// Forgot password - Request password reset email
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email, method } = req.body;
    const metadata = {
        userAgent: req.headers["user-agent"],
        ip: getClientIp(req),
    };

    const result = await authService.forgotPassword(email, metadata, method);

    // Always return success to prevent email enumeration attacks
    res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions.",
    });
});

// Reset password - Set new password using reset token
export const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const metadata = {
        userAgent: req.headers["user-agent"],
        ip: getClientIp(req),
    };

    const result = await authService.resetPassword(token, newPassword, metadata);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

// Reset password - Set new password using email + OTP
export const resetPasswordWithOtp = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const result = await authService.resetPasswordWithOtp(email, otp, newPassword);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

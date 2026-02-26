import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { conf } from "../../config/index.js";
import logger from "../../config/logger.js";

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
    logger.info("Controller: Login request received", { email, platform });

    const result = await authService.login(email, password, platform);

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
    });
});

// Refresh access token using the HttpOnly refresh cookie
export const refresh = asyncHandler(async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;

    const result = await authService.refreshAccessToken(oldRefreshToken);

    // Set the new rotated refresh token cookie
    res.cookie("refreshToken", result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
        success: true,
        token: result.accessToken,
    });
});

// Handle user logout — clears refresh token from DB and cookie
export const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

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

import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { getRefreshCookieOptions } from "../../utils/token.util.js";

// Handle user login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // login logic service function
    const result = await authService.login(email, password);

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    // Send access token + user data in the response body
    res.status(200).json({
        success: true,
        token: result.accessToken,
        user: result.user,
    });
});

// Handle refresh access token
export const refresh = asyncHandler(async (req, res) => {
    const oldRefreshToken = req.cookies?.refreshToken;
    const result = await authService.refreshAccessToken(oldRefreshToken);

    // Rotate: set new refresh token cookie
    res.cookie("refreshToken", result.refreshToken, getRefreshCookieOptions());

    res.status(200).json({
        success: true,
        token: result.accessToken,
    });
});

// Handle user logout
export const logout = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (userId) {
        await authService.logout(userId);
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: getRefreshCookieOptions().secure,
        sameSite: "strict",
        path: "/",
    });

    logger.info(`User ${userId || "unknown"} logged out`);

    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
});

// Check current authentication status
export const checkAuthStatus = (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user
    });
};

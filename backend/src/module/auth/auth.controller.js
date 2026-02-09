import * as authService from "./auth.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js"; // Import the logger

// Handle user login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // login logic service function
    const result = await authService.login(email, password);

    res.status(200).json({ 
        success: true, 
        token: result.token, 
        user: result.user 
    });
});

// Handle user logout
export const logout = asyncHandler(async (req, res) => {
    const result = await authService.logout();
    res.status(200).json({ 
        success: true, 
        ...result 
    });
    logger.info("User logged out");
});

// Check current authentication status
export const checkAuthStatus = (req, res) => {
    res.status(200).json({ 
        success: true, 
        user: req.user 
    });
};

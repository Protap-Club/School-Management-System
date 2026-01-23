/**
 * Auth Controller - Handles incoming HTTP requests related to authentication.
 * It acts as the interface between the client and the authentication service.
 */

import * as authService from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Handles user login requests.
 * Extracts email and password from the request body, calls the authentication service,
 * and sends back a JWT token and user details upon successful login.
 * Errors are caught by the `asyncHandler` and passed to the centralized error middleware.
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    logger.info(`Received login request for email: ${email}`);
    
    // Delegate the login logic to the authentication service.
    const result = await authService.login(email, password);
    
    // Respond with success message, token, and user data.
    res.status(200).json({ success: true, token: result.token, user: result.user });
    logger.info(`Login successful for user: ${email}`);
});

/**
 * Checks the authentication status of the current user.
 * This endpoint is typically used by the frontend to verify if a user's session is still active.
 * If `checkAuth` middleware passes, `req.user` will contain the authenticated user's details.
 * GET /api/v1/auth/check
 */
export const checkAuthStatus = (req, res) => {
    logger.info(`Checking authentication status for user: ${req.user ? req.user.email : 'unknown'}`);
    // Respond with the authenticated user's details.
    res.status(200).json({ success: true, user: req.user });
    logger.debug(`Auth status checked. User: ${req.user ? req.user.email : 'not authenticated'}`);
};

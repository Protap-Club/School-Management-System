/**
 * Auth Service - Handles authentication-related business logic.
 * This includes user login and token generation.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { conf } from "../config/index.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Authenticates a user with provided email and password.
 * Generates a JWT token upon successful authentication.
 *
 * @param {string} email - The user's email address.
 * @param {string} password - The user's plain text password.
 * @returns {Promise<{user: object, token: string}>} An object containing the authenticated user's data and a JWT token.
 * @throws {CustomError} If authentication fails due to invalid credentials, deactivated account, or role restrictions.
 */
export const login = async (email, password) => {
    logger.info(`Attempting login for email: ${email}`);

    // Basic validation for presence of email and password
    if (!email || !password) {
        logger.warn("Login attempt failed: Email or password not provided.");
        throw new CustomError("Please provide email and password", 400);
    }

    // Find user by email, explicitly selecting the password field.
    // Also populate schoolId to include school name and code in the user object.
    const user = await User.findOne({ email })
        .select('+password')
        .populate('schoolId', 'name code');

    // If no user is found with the given email.
    if (!user) {
        logger.warn(`Login attempt failed for email ${email}: User not found.`);
        throw new CustomError("Invalid credentials", 401);
    }

    // Restrict student roles from accessing the backend portal.
    if (user.role === USER_ROLES.STUDENT) {
        logger.warn(`Login attempt for student ${email} to restricted portal.`);
        throw new CustomError("Students cannot access this portal", 403);
    }

    // Check if the user account is active.
    if (!user.isActive) {
        logger.warn(`Login attempt for inactive user ${email}.`);
        throw new CustomError("Account deactivated", 403);
    }

    // Compare the provided password with the hashed password stored in the database.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        logger.warn(`Login attempt failed for email ${email}: Incorrect password.`);
        throw new CustomError("Invalid credentials", 401);
    }

    // Update the user's last login timestamp.
    user.lastLoginAt = new Date();
    await user.save();
    logger.info(`User ${user.email} logged in successfully. Last login updated.`);

    // Generate a JSON Web Token for the authenticated user.
    const token = jwt.sign({ id: user._id }, conf.JWT_SECRET, { expiresIn: "7d" });
    logger.debug(`JWT token generated for user ${user._id}.`);

    // Create a response object for the user, omitting the sensitive password field.
    const userResponse = user.toObject();
    delete userResponse.password;

    return { user: userResponse, token };
};

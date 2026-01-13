/**
 * Auth Service - Authentication business logic
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { conf } from "../config/index.js";
import { USER_ROLES } from "../constants/userRoles.js";

/**
 * Custom error with status code
 */
class ServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Authenticate user with email and password
 * @returns {Promise<{user: Object, token: string}>}
 * @throws {ServiceError}
 */
export const login = async (email, password) => {
    if (!email || !password) {
        throw new ServiceError("Please provide email and password", 400);
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        throw new ServiceError("Invalid credentials", 401);
    }

    if (user.role === USER_ROLES.STUDENT) {
        throw new ServiceError("Students cannot access this portal", 403);
    }

    if (!user.isActive) {
        throw new ServiceError("Account deactivated", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new ServiceError("Invalid credentials", 401);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ id: user._id }, conf.JWT_SECRET, { expiresIn: "7d" });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return { user: userResponse, token };
};

export { ServiceError };

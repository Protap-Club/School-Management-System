import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { conf } from "../config/index.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Middleware to check for user authentication.
 * It verifies the JWT token from the Authorization header and attaches the authenticated user to `req.user`.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void} Calls next() if authentication succeeds, or sends a 401 response if it fails.
 */
const checkAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers?.authorization;

        // Check if the Authorization header exists and starts with "Bearer ".
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            logger.warn("Auth check failed: No token or invalid token format provided.");
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        // Extract the token part from the header.
        const token = authHeader.split(" ")[1];
        // Verify the token using the application's JWT secret.
        const decoded = jwt.verify(token, conf.JWT_SECRET);
        logger.debug(`Token decoded for user ID: ${decoded.id}`);

        // Find the user in the database based on the decoded ID.
        // We explicitly exclude the password and populate schoolId for convenience.
        const user = await User.findById(decoded.id)
            .select("-password")
            .populate('schoolId', '_id name code');

        // If no user is found with the ID from the token, the token is invalid.
        if (!user) {
            logger.warn(`Auth check failed: User not found for decoded ID ${decoded.id}.`);
            return res.status(401).json({ success: false, message: "User not found" });
        }

        // Attach the found user object to the request for subsequent middleware/route handlers.
        req.user = user;
        logger.info(`User ${user.email} authenticated successfully.`);
        next(); // Proceed to the next middleware or route handler.
    } catch (error) {
        // Handle various JWT errors (e.g., token expired, invalid signature).
        logger.error(`Auth Middleware Error: ${error.message}`);
        return res.status(401).json({ success: false, message: "Token is not valid or has expired" });
    }
};

export { checkAuth };
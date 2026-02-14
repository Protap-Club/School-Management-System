import logger from "../config/logger.js";
import { UnauthorizedError, ForbiddenError } from "../utils/customError.js";

// Middleware to restrict access based on user roles.

const checkRole = (allowedRoles) => {
    return (req, res, next) => {

        // Ensure user is authenticated (populated by auth middleware)
        if (!req.user) {
            logger.warn("Role check failed: Missing user context.");
            throw new UnauthorizedError("Authentication required");
        }

        // Check if user's role exists in the allowed list (assumes DB roles are lowercase)
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied: User ${req.user._id} (${req.user.role}) is not authorized.`);
            throw new ForbiddenError("Access denied");
        }
        
        next();
    };
};

export { checkRole };
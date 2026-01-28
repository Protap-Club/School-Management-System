import logger from "../config/logger.js";

// Middleware to restrict access based on user roles.

const checkRole = (allowedRoles) => {
    return (req, res, next) => {

        // Ensure user is authenticated (populated by auth middleware)
        if (!req.user) {
            logger.warn("Role check failed: Missing user context.");
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        // Check if user's role exists in the allowed list (assumes DB roles are lowercase)
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied: User ${req.user._id} (${req.user.role}) is not authorized.`);
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        
        next();
    };
};

export { checkRole };
import logger from "../config/logger.js"; // Import the logger

/**
 * Middleware factory to check if the authenticated user has one of the allowed roles.
 *
 * @param {string[]} allowedRoles - An array of role strings that are permitted to access the route.
 * @returns {Function} An Express middleware function.
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // Ensure authentication has already occurred and `req.user` is populated.
        if (!req.user) {
            logger.warn("Role check failed: Authentication required but req.user is missing.");
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const userRole = req.user.role.toLowerCase();
        // Check if the user's role is present in the list of allowed roles.
        const authorized = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!authorized) {
            logger.warn(`Role check failed: User ${req.user._id} with role '${req.user.role}' is not authorized. Allowed roles: [${allowedRoles.join(', ')}].`);
            return res.status(403).json({ success: false, message: `Role ${req.user.role} not authorized` });
        }

        logger.debug(`Role check passed for user ${req.user._id} with role '${req.user.role}'.`);
        next(); // User has an authorized role, proceed.
    };
};

export { checkRole };
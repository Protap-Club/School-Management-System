// Middleware to extract and validate school ID from various request sources.

import logger from "../config/logger.js"; // Import the logger

/**
 * Middleware to extract the `schoolId` from request parameters, body, or the authenticated user object.
 * This centralizes the logic for determining which school context a request is operating within.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void} Attaches `req.schoolId` and calls next(), or sends a 400 response if school ID is missing for non-Super Admins.
 */
const extractSchoolId = (req, res, next) => {
    logger.debug(`Attempting to extract schoolId for user: ${req.user?._id}, role: ${req.user?.role}`);
    
    // Prioritize schoolId from user's context (if populated), then body, then params.
    const userSchoolId = req.user?.schoolId?._id || req.user?.schoolId;
    const schoolId = req.body.schoolId || req.params.id || userSchoolId;

    // Super Admins operate globally and don't always need a specific schoolId context for certain actions.
    if (!schoolId && req.user?.role === 'super_admin') {
        logger.debug("Super admin detected, proceeding without specific schoolId context.");
        return next();
    }

    // If no schoolId is found for a non-Super Admin, it's a bad request.
    if (!schoolId) {
        logger.warn(`Failed to extract schoolId for user ${req.user?._id}. School ID is required.`);
        return res.status(400).json({ success: false, message: "School ID is required but was not provided." });
    }

    // Attach the resolved schoolId to the request object for downstream use.
    req.schoolId = schoolId.toString();
    logger.debug(`School ID '${req.schoolId}' extracted and attached to request.`);
    next();
};

export default extractSchoolId;
import logger from "../config/logger.js";
import { UnauthorizedError, BadRequestError } from "../utils/customError.js";

// Middleware to extract the strict school context for the request.

const extractSchoolId = (req, res, next) => {
    try {
        // Ensure user is authenticated before extracting context
        if (!req.user) {
            throw new UnauthorizedError("User not authenticated");
        }

        // Default: Trust the logged-in user's assigned school
        let schoolId = req.user.schoolId?._id || req.user.schoolId;

        // Non-Super Admins MUST have a school context
        if (!schoolId && req.user.role !== 'super_admin') {
            logger.warn(`Context missing: User ${req.user._id} has no school assigned.`);
            throw new BadRequestError("School context required");
        }

        // Attach normalized ID to request
        if (schoolId) {
            req.schoolId = String(schoolId);
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default extractSchoolId;
import logger from "../config/logger.js";

// Middleware to extract the strict school context for the request.

const extractSchoolId = (req, res, next) => {
    try {
        // Ensure user is authenticated before extracting context
        if (!req.user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        // Default: Trust the logged-in user's assigned school
        let schoolId = req.user.schoolId?._id || req.user.schoolId;

        // Non-Super Admins MUST have a school context
        if (!schoolId && req.user.role !== 'super_admin') {
            logger.warn(`Context missing: User ${req.user._id} has no school assigned.`);
            return res.status(400).json({ success: false, message: "School context required" });
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
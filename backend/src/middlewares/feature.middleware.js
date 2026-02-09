import * as schoolService from "../module/school/school.service.js";
import logger from "../config/logger.js";

// Middleware to check if a school has a specific feature enabled.

export const requireFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            // Safe extraction of user data
            const user = req.user;
            if (!user) {
                return res.status(401).json({ success: false, message: "Authentication required" });
            }

            const schoolId = user.schoolId?._id || user.schoolId;

            // Non-admins must belong to a school
            if (!schoolId) {
                logger.warn(`Feature '${featureKey}' blocked: User ${req.user?._id} has no school.`);
                return res.status(403).json({ success: false, message: "No school assigned." });
            }

            // Check the database (cached in service layer if possible)
            const isEnabled = await schoolService.hasFeature(schoolId, featureKey);

            if (!isEnabled) {
                logger.warn(`Feature '${featureKey}' denied for School ${schoolId}`);
                return res.status(403).json({ 
                    success: false, 
                    message: `The '${featureKey}' module is not enabled for your school.` 
                });
            }

            next();
        } catch (error) {
            // Pass to global error handler
            next(error); 
        }
    };
};
/**
 * Feature Middleware - Provides functions to check if a specific feature
 * is enabled for a user's school before allowing access to a route.
 */

import * as schoolService from "../services/school.service.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Middleware factory that returns a middleware function to check for a required feature.
 * If the feature is not enabled for the user's school, access is denied.
 * Super Admins bypass this check as they manage features globally.
 *
 * Usage: `router.get('/attendance', checkAuth, requireFeature('attendance'), attendanceController)`
 *
 * @param {string} featureKey - The key of the feature to check (e.g., 'attendance', 'fees').
 * @returns {Function} An Express middleware function.
 */
export const requireFeature = (featureKey) => {
    return async (req, res, next) => {
        logger.debug(`Checking feature '${featureKey}' for user: ${req.user._id} (${req.user.role})`);
        try {
            // Extract schoolId from the authenticated user object.
            const schoolId = req.user.schoolId?._id || req.user.schoolId;

            // Super Admin role can bypass feature checks as they have global access/management.
            if (!schoolId && req.user.role === 'super_admin') {
                logger.debug(`Super admin bypassing feature check for '${featureKey}'.`);
                return next();
            }

            // If a user (who is not a Super Admin) has no associated school, they cannot use school-specific features.
            if (!schoolId) {
                logger.warn(`Access denied to feature '${featureKey}': User ${req.user._id} has no school assigned.`);
                return res.status(403).json({
                    success: false,
                    message: "No school assigned. Cannot access school-specific features."
                });
            }

            // Check if the specific feature is enabled for the user's school via the school service.
            const hasFeatureEnabled = await schoolService.hasFeature(schoolId, featureKey);

            if (!hasFeatureEnabled) {
                logger.warn(`Access denied to feature '${featureKey}': Not enabled for school ID ${schoolId}.`);
                return res.status(403).json({
                    success: false,
                    message: `The "${featureKey}" feature is not enabled for your school.`,
                    featureRequired: featureKey
                });
            }

            logger.info(`Access granted to feature '${featureKey}' for user ${req.user._id} in school ${schoolId}.`);
            next(); // Feature is enabled, proceed to the next middleware/route handler.
        } catch (error) {
            logger.error(`Feature Check Error for '${featureKey}': ${error.message}`);
            res.status(500).json({
                success: false,
                message: "Failed to verify feature access"
            });
        }
    };
};

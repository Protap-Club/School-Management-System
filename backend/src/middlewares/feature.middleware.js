/**
 * Feature Middleware - Check if school has feature enabled before allowing access
 */

import * as schoolService from "../services/school.service.js";

/**
 * Middleware factory to require a specific feature
 * Usage: router.get('/attendance', checkAuth, requireFeature('attendance'), attendanceController)
 */
export const requireFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            // Extract schoolId - handle populated object
            const schoolId = req.user.schoolId?._id || req.user.schoolId;

            // Super admin has no schoolId - they manage all schools, bypass feature check
            if (!schoolId && req.user.role === 'super_admin') {
                return next();
            }

            // No school = no access to features
            if (!schoolId) {
                return res.status(403).json({
                    success: false,
                    message: "No school assigned"
                });
            }

            const hasFeatureEnabled = await schoolService.hasFeature(schoolId, featureKey);

            if (!hasFeatureEnabled) {
                return res.status(403).json({
                    success: false,
                    message: `The "${featureKey}" feature is not enabled for your school`,
                    featureRequired: featureKey
                });
            }

            next();
        } catch (error) {
            console.error("Feature Check Error:", error.message);
            res.status(500).json({
                success: false,
                message: "Failed to verify feature access"
            });
        }
    };
};

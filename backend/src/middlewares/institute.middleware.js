// Institute Isolation Middleware - Ensures users can only access their own institute's data

import Institute from "../models/Institute.model.js";
import { USER_ROLES } from "../constants/userRoles.js";

// Ensure user belongs to an institute (except for some SuperAdmin operations)
export const requireInstitute = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // SuperAdmin may or may not have instituteId depending on operation
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
    }

    if (!req.user.instituteId) {
        return res.status(403).json({ success: false, message: "You must belong to an institute" });
    }

    next();
};

// Ensure SuperAdmin can only access their own institute
export const checkInstituteAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const targetInstituteId = req.params.id || req.body.instituteId || req.query.instituteId;

    if (!targetInstituteId) {
        return next(); // No institute specified, let controller handle it
    }

    // SuperAdmin can only access their own institute
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        if (req.user.instituteId && req.user.instituteId.toString() !== targetInstituteId) {
            return res.status(403).json({ success: false, message: "Access denied to other institute" });
        }
    } else {
        // Non-SuperAdmin must match their own institute
        if (!req.user.instituteId || req.user.instituteId.toString() !== targetInstituteId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
    }

    next();
};

// Verify institute exists and is active
export const verifyInstitute = async (req, res, next) => {
    const instituteId = req.params.id || req.body.instituteId;

    if (!instituteId) return next();

    try {
        const institute = await Institute.findById(instituteId);
        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }
        if (!institute.isActive) {
            return res.status(403).json({ success: false, message: "Institute is deactivated" });
        }
        req.institute = institute;
        next();
    } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid institute ID" });
    }
};

// Add instituteId to query for school isolation
export const scopeToInstitute = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // SuperAdmin uses their own instituteId
    if (req.user.instituteId) {
        req.instituteScope = req.user.instituteId;
    }

    next();
};

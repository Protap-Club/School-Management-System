// School Isolation Middleware - Ensures users can only access their own school's data

import School from "../models/School.model.js";
import { USER_ROLES } from "../constants/userRoles.js";

// Ensure user belongs to a school (except for some SuperAdmin operations)
export const requireSchool = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // SuperAdmin may or may not have schoolId depending on operation
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
    }

    if (!req.user.schoolId) {
        return res.status(403).json({ success: false, message: "You must belong to a school" });
    }

    next();
};

// Ensure user can only access their own school
export const checkSchoolAccess = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const targetSchoolId = req.params.id || req.body.schoolId || req.query.schoolId;

    if (!targetSchoolId) {
        return next(); // No school specified, let controller handle it
    }

    // SuperAdmin can only access their own school
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        if (req.user.schoolId && req.user.schoolId.toString() !== targetSchoolId) {
            return res.status(403).json({ success: false, message: "Access denied to other school" });
        }
    } else {
        // Non-SuperAdmin must match their own school
        if (!req.user.schoolId || req.user.schoolId.toString() !== targetSchoolId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
    }

    next();
};

// Verify school exists and is active
export const verifySchool = async (req, res, next) => {
    const schoolId = req.params.id || req.body.schoolId;

    if (!schoolId) return next();

    try {
        const school = await School.findById(schoolId);
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }
        if (!school.isActive) {
            return res.status(403).json({ success: false, message: "School is deactivated" });
        }
        req.school = school;
        next();
    } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid school ID" });
    }
};

// Add schoolId to query for school isolation
export const scopeToSchool = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }

    // SuperAdmin uses their own schoolId
    if (req.user.schoolId) {
        req.schoolScope = req.user.schoolId;
    }

    next();
};

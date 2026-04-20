import * as schoolService from "./school.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/customError.js";

// Create a new school
export const createSchool = asyncHandler(async (req, res) => {
    const result = await schoolService.createSchool(req.user._id, req.body);
    res.status(201).json({
        success: true,
        message: "School created",
        data: result
    });
    logger.info(`School created: ${result.school.name}`);
});

// Update an existing school
export const updateSchool = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.params.id || req.user.schoolId;
    const result = await schoolService.updateSchool(
        schoolId,
        req.body,
        req.user,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );
    res.status(200).json({
        success: true,
        message: "School updated",
        data: result
    });
    logger.info(`School updated: ${result.school.name}`);
});

// Get school profile
export const getSchoolById = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.params.id || req.user.schoolId;
    const school = await schoolService.getSchoolProfile(schoolId);
    res.status(200).json({
        success: true,
        data: school
    });
});

// Get school branding (logo, theme)
export const getMySchoolBranding = asyncHandler(async (req, res) => {
    const branding = await schoolService.getSchoolBranding(req.schoolId);
    res.status(200).json({
        success: true,
        data: branding
    });
});

// Upload school logo
export const uploadSchoolLogo = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");
    // Cloudinary returns the full URL in req.file.path and public_id in req.file.filename
    const logoUrl = req.file.path || req.file.secure_url || req.file.url;
    const logoPublicId = req.file.filename || req.file.public_id;

    const result = await schoolService.updateLogo(req.schoolId, logoUrl, logoPublicId);
    res.status(200).json({
        success: true,
        message: "Logo uploaded",
        data: result
    });
    logger.info(`Logo uploaded for school: ${req.schoolId}`);
});

// Get available feature list
export const getAvailableFeatures = asyncHandler(async (req, res) => {
    const features = schoolService.getAvailableFeatures();
    res.status(200).json({
        success: true,
        data: features
    });
});

// Update school features
export const updateFeatures = asyncHandler(async (req, res) => {
    // Only super admin can do this typically, but the role check is in the route
    const { features } = req.body;
    if (!features) {
        throw new BadRequestError("Features data is required");
    }
    const result = await schoolService.updateSchoolFeatures(
        req.schoolId,
        features,
        req.user,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );
    res.status(200).json({
        success: true,
        message: "Features updated successfully",
        data: result
    });
    logger.info(`Features updated for school: ${req.schoolId}`);
});

// Get unique classes and sections for the school
export const getSchoolClasses = asyncHandler(async (req, res) => {
    const result = await schoolService.getSchoolClasses(req.schoolId);
    res.status(200).json({
        success: true,
        data: result
    });
});

export const addSchoolClassSection = asyncHandler(async (req, res) => {
    const result = await schoolService.addSchoolClassSection(req.schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "Class-section added successfully",
        data: result
    });
});

export const removeSchoolClassSection = asyncHandler(async (req, res) => {
    const result = await schoolService.removeSchoolClassSection(req.schoolId, req.body);
    res.status(200).json({
        success: true,
        message: "Class-section removed successfully",
        data: result
    });
});

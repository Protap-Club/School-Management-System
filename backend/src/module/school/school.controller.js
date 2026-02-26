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
    const result = await schoolService.updateSchool(schoolId, req.body);
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
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const result = await schoolService.updateLogo(req.schoolId, logoUrl);
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

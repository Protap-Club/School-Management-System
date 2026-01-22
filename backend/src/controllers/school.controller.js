/**
 * School Controller - Handles HTTP requests related to school management.
 * This includes CRUD operations for schools, logo and theme management,
 * and school feature configuration.
 */

import * as schoolService from "../services/school.service.js";
import { deleteFile } from "../middlewares/upload.middleware.js"; // Utility to delete files
import asyncHandler from "../utils/asyncHandler.js"; // Wrapper for async route handlers
import logger from "../config/logger.js"; // Import the logger

// ═══════════════════════════════════════════════════════════════
// Core School CRUD Controllers
// ═══════════════════════════════════════════════════════════════

/**
 * Creates a new school.
 * Requires `req.user._id` for the creator and school details in `req.body`.
 * POST /api/v1/school
 */
export const createSchool = asyncHandler(async (req, res) => {
    logger.info(`Received request to create school by user: ${req.user._id}`);
    
    const school = await schoolService.createSchool(req.user._id, req.body);
    
    res.status(201).json({ success: true, message: "School created", data: school });
    logger.info(`School '${school.name}' (ID: ${school._id}) created successfully.`);
});

/**
 * Retrieves a list of schools based on the authenticated user's role.
 * Super Admins see all, others see their own school.
 * GET /api/v1/school
 */
export const getSchools = asyncHandler(async (req, res) => {
    logger.info(`Received request to get schools by user: ${req.user._id} (${req.user.role})`);
    
    const schools = await schoolService.getSchools(req.user.role, req.user.schoolId);
    
    res.status(200).json({ success: true, count: schools.length, data: schools });
    logger.info(`Fetched ${schools.length} schools for user ${req.user._id}.`);
});

/**
 * Retrieves a single school by ID.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * GET /api/v1/school/:id
 */
export const getSchoolById = asyncHandler(async (req, res) => {
    logger.info(`Received request to get school by ID: ${req.schoolId} by user: ${req.user._id}`);
    
    const school = await schoolService.getSchoolById(req.schoolId, req.user.role, req.user.schoolId);
    
    res.status(200).json({ success: true, data: school });
    logger.info(`Fetched school '${school.name}' (ID: ${school._id}) for user ${req.user._id}.`);
});

/**
 * Updates an existing school by ID.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * PUT /api/v1/school/:id
 */
export const updateSchool = asyncHandler(async (req, res) => {
    logger.info(`Received request to update school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    const school = await schoolService.updateSchool(req.schoolId, req.body);
    
    res.status(200).json({ success: true, message: "School updated", data: school });
    logger.info(`School '${school.name}' (ID: ${school._id}) updated successfully.`);
});

/**
 * Deletes a school by ID.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * DELETE /api/v1/school/:id
 */
export const deleteSchool = asyncHandler(async (req, res) => {
    logger.info(`Received request to delete school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    await schoolService.deleteSchool(req.schoolId);
    
    res.status(200).json({ success: true, message: "School deleted" });
    logger.info(`School ID: ${req.schoolId} deleted successfully.`);
});

/**
 * Retrieves a list of active schools, primarily for UI selection/dropdowns.
 * GET /api/v1/school/list
 */
export const getSchoolsList = asyncHandler(async (req, res) => {
    logger.info(`Received request to get active schools list by user: ${req.user._id}`);
    
    const schools = await schoolService.getSchoolsList();
    
    res.status(200).json({ success: true, data: schools });
    logger.info(`Fetched ${schools.length} active schools for list display.`);
});

// ═══════════════════════════════════════════════════════════════
// School Branding (Logo & Theme) Controllers
// ═══════════════════════════════════════════════════════════════

/**
 * Uploads a new logo for a school.
 * Handles file upload via `upload.single('logo')` middleware.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * POST /api/v1/school/logo
 */
export const uploadSchoolLogo = asyncHandler(async (req, res) => {
    logger.info(`Received request to upload logo for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    if (!req.file) {
        logger.warn(`Logo upload failed for school ID: ${req.schoolId}: No file provided.`);
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    // Delegate to service to update database record and return old logo path for cleanup.
    const result = await schoolService.uploadLogo(req.schoolId, logoUrl, req.user);

    // If an old logo existed, delete its physical file.
    if (result.oldLogoUrl && result.oldLogoUrl.startsWith('/uploads/')) {
        deleteFile(result.oldLogoUrl);
        logger.info(`Old logo file ${result.oldLogoUrl} deleted for school ID: ${req.schoolId}.`);
    }

    res.status(200).json({
        success: true,
        message: "Logo uploaded successfully",
        data: { logoUrl, school: result.school }
    });
    logger.info(`Logo uploaded successfully for school ID: ${req.schoolId}.`);
});

/**
 * Deletes a school's logo.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * DELETE /api/v1/school/logo
 */
export const deleteSchoolLogo = asyncHandler(async (req, res) => {
    logger.info(`Received request to delete logo for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    // Delegate to service to update database record and return old logo path for cleanup.
    const result = await schoolService.deleteLogo(req.schoolId, req.user);

    // If a logo was deleted, delete its physical file.
    if (result.oldLogoUrl && result.oldLogoUrl.startsWith('/uploads/')) {
        deleteFile(result.oldLogoUrl);
        logger.info(`Deleted old logo file ${result.oldLogoUrl} for school ID: ${req.schoolId}.`);
    }

    res.status(200).json({
        success: true,
        message: "Logo deleted successfully",
        data: { school: result.school }
    });
    logger.info(`Logo deleted successfully for school ID: ${req.schoolId}.`);
});

/**
 * Retrieves branding information (logo, theme) for the specified school.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * GET /api/v1/school/branding
 */
export const getMySchoolBranding = asyncHandler(async (req, res) => {
    logger.info(`Received request to get branding for school ID: ${req.schoolId || 'default'} by user: ${req.user._id}`);
    
    const branding = await schoolService.getSchoolBranding(req.schoolId);
    
    res.status(200).json({ success: true, data: branding });
    logger.info(`Branding fetched for school ID: ${req.schoolId || 'default'}.`);
});

/**
 * Updates a school's theme (e.g., accent color).
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * PUT /api/v1/school/theme
 */
export const updateSchoolTheme = asyncHandler(async (req, res) => {
    logger.info(`Received request to update theme for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    const branding = await schoolService.updateTheme(req.schoolId, req.body.theme || req.body, req.user);
    
    res.status(200).json({ success: true, message: "Theme updated", data: branding });
    logger.info(`Theme updated successfully for school ID: ${req.schoolId}.`);
});

// ═══════════════════════════════════════════════════════════════
// Feature Management Controllers
// ═══════════════════════════════════════════════════════════════

/**
 * Retrieves all feature flags and their statuses for a specific school.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * GET /api/v1/school/:id/features
 */
export const getSchoolFeatures = asyncHandler(async (req, res) => {
    logger.info(`Received request to get features for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    const result = await schoolService.getSchoolFeatures(req.schoolId);
    
    res.status(200).json({ success: true, data: result });
    logger.info(`Features fetched for school ID: ${req.schoolId}.`);
});

/**
 * Updates multiple feature flags for a school simultaneously.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * PUT /api/v1/school/:id/features
 */
export const updateSchoolFeatures = asyncHandler(async (req, res) => {
    logger.info(`Received request to update features for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    const result = await schoolService.updateSchoolFeatures(req.schoolId, req.body.features, req.user);
    
    res.status(200).json({ success: true, message: "Features updated", data: result });
    logger.info(`Features updated successfully for school ID: ${req.schoolId}.`);
});

/**
 * Toggles a single feature for a school.
 * The `extractSchoolId` middleware populates `req.schoolId`.
 * PATCH /api/v1/school/:id/features/:featureKey
 */
export const toggleSchoolFeature = asyncHandler(async (req, res) => {
    const { featureKey } = req.params;
    const { enabled } = req.body;
    logger.info(`Received request to toggle feature '${featureKey}' to ${enabled} for school ID: ${req.schoolId} by user: ${req.user._id}`);
    
    if (enabled === undefined) {
        logger.warn(`Toggle feature failed for school ID: ${req.schoolId}: 'enabled' field is required.`);
        return res.status(400).json({ success: false, message: "enabled field is required" });
    }

    const result = await schoolService.toggleSchoolFeature(req.schoolId, featureKey, enabled, req.user);
    
    res.status(200).json({ success: true, message: `Feature ${featureKey} ${enabled ? 'enabled' : 'disabled'}`, data: result });
    logger.info(`Feature '${featureKey}' toggled to ${enabled} for school ID: ${req.schoolId}.`);
});

/**
 * Retrieves a list of all available features with metadata.
 * GET /api/v1/school/features/list
 */
export const getAvailableFeatures = asyncHandler(async (req, res) => {
    logger.info(`Received request to get available features list by user: ${req.user._id}`);
    
    const features = schoolService.getAvailableFeatures();
    
    res.status(200).json({ success: true, data: features });
    logger.info(`Available features list fetched.`);
});


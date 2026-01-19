// School Controller - HTTP layer for school management

import * as schoolService from "../services/school.service.js";
import { deleteFile } from "../middlewares/upload.middleware.js";

export const createSchool = async (req, res) => {
    try {
        const school = await schoolService.createSchool(req.user._id, req.body);
        res.status(201).json({ success: true, message: "School created", data: school });
    } catch (error) {
        console.error("Create School Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getSchools = async (req, res) => {
    try {
        const schools = await schoolService.getSchools(req.user.role, req.user.schoolId);
        res.status(200).json({ success: true, count: schools.length, data: schools });
    } catch (error) {
        console.error("Get Schools Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getSchoolById = async (req, res) => {
    try {
        const school = await schoolService.getSchoolById(req.params.id, req.user.role, req.user.schoolId);
        res.status(200).json({ success: true, data: school });
    } catch (error) {
        console.error("Get School Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const updateSchool = async (req, res) => {
    try {
        const school = await schoolService.updateSchool(req.params.id, req.body);
        res.status(200).json({ success: true, message: "School updated", data: school });
    } catch (error) {
        console.error("Update School Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const deleteSchool = async (req, res) => {
    try {
        await schoolService.deleteSchool(req.params.id);
        res.status(200).json({ success: true, message: "School deleted" });
    } catch (error) {
        console.error("Delete School Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getSchoolsList = async (req, res) => {
    try {
        const schools = await schoolService.getSchoolsList();
        res.status(200).json({ success: true, data: schools });
    } catch (error) {
        console.error("Get Schools List Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const uploadSchoolLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        // Use current user's school or provided schoolId (for super_admin)
        const schoolId = req.body.schoolId || req.user.schoolId;
        const logoUrl = `/uploads/logos/${req.file.filename}`;

        // Super admin - return success with logo URL (uses default branding)
        if (!schoolId && req.user.role === 'super_admin') {
            return res.status(200).json({
                success: true,
                message: "Logo uploaded (Super Admin uses default branding)",
                data: { logoUrl }
            });
        }

        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID required" });
        }

        const result = await schoolService.uploadLogo(schoolId, logoUrl, req.user);

        // Delete old logo file if exists
        if (result.oldLogoUrl && result.oldLogoUrl.startsWith('/uploads/')) {
            deleteFile(result.oldLogoUrl);
        }

        res.status(200).json({
            success: true,
            message: "Logo uploaded successfully",
            data: { logoUrl, school: result.school }
        });
    } catch (error) {
        console.error("Upload School Logo Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const deleteSchoolLogo = async (req, res) => {
    try {
        const schoolId = req.body.schoolId || req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID required" });
        }

        const result = await schoolService.deleteLogo(schoolId, req.user);

        // Delete file if exists
        if (result.oldLogoUrl && result.oldLogoUrl.startsWith('/uploads/')) {
            deleteFile(result.oldLogoUrl);
        }

        res.status(200).json({
            success: true,
            message: "Logo deleted successfully",
            data: { school: result.school }
        });
    } catch (error) {
        console.error("Delete School Logo Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getMySchoolBranding = async (req, res) => {
    try {
        const branding = await schoolService.getSchoolBranding(req.user.schoolId);
        res.status(200).json({ success: true, data: branding });
    } catch (error) {
        console.error("Get My Branding Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const updateSchoolTheme = async (req, res) => {
    try {
        const schoolId = req.body.schoolId || req.user.schoolId;

        // Super admin uses default Protap branding - no need to save
        if (!schoolId && req.user.role === 'super_admin') {
            return res.status(200).json({
                success: true,
                message: "Theme updated (Super Admin uses default branding)",
                data: { theme: { accentColor: req.body.accentColor || '#2563eb' } }
            });
        }

        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID required" });
        }

        const branding = await schoolService.updateTheme(schoolId, req.body.theme || req.body, req.user);
        res.status(200).json({ success: true, message: "Theme updated", data: branding });
    } catch (error) {
        console.error("Update Theme Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};



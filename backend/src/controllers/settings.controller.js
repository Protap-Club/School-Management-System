import Settings from "../models/Settings.model.js";

/**
 * @desc    Get settings (public - for theme/logo)
 * @route   GET /api/v1/settings
 * @access  Public
 */
export const getSettings = async (req, res) => {
    try {
        // Get the first (and only) settings document
        let settings = await Settings.findOne();

        // If no settings exist, create default
        if (!settings) {
            settings = await Settings.create({
                schoolName: "School Management System",
                theme: {
                    mode: "light",
                    accentColor: "#2563eb"
                }
            });
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Update settings
 * @route   PUT /api/v1/settings
 * @access  Private (Admin/SuperAdmin only)
 */
export const updateSettings = async (req, res) => {
    try {
        const {
            schoolName,
            schoolCode,
            logoUrl,
            address,
            contactEmail,
            contactPhone,
            welcomeMessage,
            academicYear,
            theme
        } = req.body;

        // Find existing settings or create new
        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings();
        }

        // Update fields if provided
        if (schoolName) settings.schoolName = schoolName;
        if (schoolCode !== undefined) settings.schoolCode = schoolCode;
        if (logoUrl !== undefined) settings.logoUrl = logoUrl;
        if (address !== undefined) settings.address = address;
        if (contactEmail !== undefined) settings.contactEmail = contactEmail;
        if (contactPhone !== undefined) settings.contactPhone = contactPhone;
        if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage;
        if (academicYear !== undefined) settings.academicYear = academicYear;
        if (theme) {
            if (theme.mode) settings.theme.mode = theme.mode;
            if (theme.accentColor) settings.theme.accentColor = theme.accentColor;
        }

        await settings.save();

        res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            data: settings
        });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

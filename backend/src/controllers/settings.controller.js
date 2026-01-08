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
                logoUrl: "",
                theme: {
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
        const { logoUrl, theme } = req.body;

        // Find existing settings or create new
        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings();
        }

        // Update fields if provided
        if (logoUrl !== undefined) settings.logoUrl = logoUrl;
        if (theme && theme.accentColor) {
            settings.theme.accentColor = theme.accentColor;
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

/**
 * @desc    Upload logo file
 * @route   POST /api/v1/settings/upload-logo
 * @access  Private (Admin/SuperAdmin only)
 */
export const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        // Construct the URL for the uploaded file
        const logoUrl = `/uploads/${req.file.filename}`;

        // Update settings with the new logo URL
        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings();
        }

        settings.logoUrl = logoUrl;
        await settings.save();

        res.status(200).json({
            success: true,
            message: "Logo uploaded successfully",
            data: {
                logoUrl: logoUrl,
                settings: settings
            }
        });
    } catch (error) {
        console.error("Upload Logo Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



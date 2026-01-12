import Settings from "../models/Settings.model.js";

export const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create({ logoUrl: "", theme: { accentColor: "#2563eb" } });
        }

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const { logoUrl, theme } = req.body;

        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        if (logoUrl !== undefined) settings.logoUrl = logoUrl;
        if (theme?.accentColor) settings.theme.accentColor = theme.accentColor;

        await settings.save();

        res.status(200).json({ success: true, message: "Settings updated", data: settings });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const logoUrl = `/uploads/${req.file.filename}`;

        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        settings.logoUrl = logoUrl;
        await settings.save();

        res.status(200).json({ success: true, message: "Logo uploaded", data: { logoUrl, settings } });
    } catch (error) {
        console.error("Upload Logo Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

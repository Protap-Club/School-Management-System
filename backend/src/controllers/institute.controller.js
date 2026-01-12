import Institute from "../models/Institute.model.js";
import User from "../models/User.model.js";

export const createInstitute = async (req, res) => {
    try {
        const { name, code, address, contactEmail, contactPhone, logoUrl, theme, features } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: "Name and code are required" });
        }

        const existingInstitute = await Institute.findOne({ code: code.toUpperCase() });
        if (existingInstitute) {
            return res.status(409).json({ success: false, message: "Institute code already exists" });
        }

        const instituteData = {
            name,
            code: code.toUpperCase(),
            address,
            contactEmail,
            contactPhone,
            logoUrl,
            createdBy: req.user._id
        };

        if (theme?.accentColor) instituteData.theme = { accentColor: theme.accentColor };
        if (features) instituteData.features = { attendance: { enabled: features.attendance?.enabled || false } };

        const institute = await Institute.create(instituteData);

        res.status(201).json({ success: true, message: "Institute created", data: institute });
    } catch (error) {
        console.error("Create Institute Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getInstitutes = async (req, res) => {
    try {
        const currentUser = req.user;
        let institutes;

        if (currentUser.role === 'super_admin') {
            institutes = await Institute.find()
                .populate('adminCount').populate('teacherCount').populate('studentCount')
                .sort({ createdAt: -1 });
        } else if (currentUser.instituteId) {
            institutes = await Institute.find({ _id: currentUser.instituteId })
                .populate('adminCount').populate('teacherCount').populate('studentCount');
        } else {
            institutes = [];
        }

        res.status(200).json({ success: true, count: institutes.length, data: institutes });
    } catch (error) {
        console.error("Get Institutes Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getInstituteById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const institute = await Institute.findById(id)
            .populate('adminCount').populate('teacherCount').populate('studentCount');

        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }

        if (currentUser.role !== 'super_admin' && currentUser.instituteId?.toString() !== id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        res.status(200).json({ success: true, data: institute });
    } catch (error) {
        console.error("Get Institute Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateInstitute = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, contactEmail, contactPhone, logoUrl, isActive, theme, features } = req.body;

        const institute = await Institute.findById(id);
        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }

        if (name) institute.name = name;
        if (address !== undefined) institute.address = address;
        if (contactEmail !== undefined) institute.contactEmail = contactEmail;
        if (contactPhone !== undefined) institute.contactPhone = contactPhone;
        if (logoUrl !== undefined) institute.logoUrl = logoUrl;
        if (isActive !== undefined) institute.isActive = isActive;
        if (theme?.accentColor) institute.theme.accentColor = theme.accentColor;
        if (features?.attendance !== undefined) institute.features.attendance.enabled = features.attendance.enabled;

        await institute.save();

        res.status(200).json({ success: true, message: "Institute updated", data: institute });
    } catch (error) {
        console.error("Update Institute Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteInstitute = async (req, res) => {
    try {
        const { id } = req.params;

        const institute = await Institute.findById(id);
        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }

        const userCount = await User.countDocuments({ instituteId: id });
        if (userCount > 0) {
            return res.status(400).json({ success: false, message: `Cannot delete with ${userCount} users` });
        }

        await Institute.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Institute deleted" });
    } catch (error) {
        console.error("Delete Institute Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getInstitutesList = async (req, res) => {
    try {
        const institutes = await Institute.find({ isActive: true }).select('name code _id').sort({ name: 1 });
        res.status(200).json({ success: true, data: institutes });
    } catch (error) {
        console.error("Get Institutes List Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const uploadInstituteLogo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const institute = await Institute.findById(id);
        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }

        const logoUrl = `/uploads/${req.file.filename}`;
        institute.logoUrl = logoUrl;
        await institute.save();

        res.status(200).json({ success: true, message: "Logo uploaded", data: { logoUrl, institute } });
    } catch (error) {
        console.error("Upload Institute Logo Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateInstituteFeatures = async (req, res) => {
    try {
        const { id } = req.params;
        const { features } = req.body;

        const institute = await Institute.findById(id);
        if (!institute) {
            return res.status(404).json({ success: false, message: "Institute not found" });
        }

        if (features.attendance !== undefined) {
            institute.features.attendance.enabled = features.attendance.enabled;
        }

        await institute.save();

        res.status(200).json({ success: true, message: "Features updated", data: institute });
    } catch (error) {
        console.error("Update Features Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMyInstituteBranding = async (req, res) => {
    try {
        const user = req.user;

        if (!user.instituteId) {
            return res.status(200).json({ success: true, data: null });
        }

        const institute = await Institute.findById(user.instituteId).select('name logoUrl theme');
        res.status(200).json({ success: true, data: institute });
    } catch (error) {
        console.error("Get My Branding Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

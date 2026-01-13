import School from "../models/School.model.js";
import User from "../models/User.model.js";

export const createSchool = async (req, res) => {
    try {
        const { name, code, address, contactEmail, contactPhone, logoUrl, theme } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: "Name and code are required" });
        }

        const existingSchool = await School.findOne({ code: code.toUpperCase() });
        if (existingSchool) {
            return res.status(409).json({ success: false, message: "School code already exists" });
        }

        const schoolData = {
            name,
            code: code.toUpperCase(),
            address,
            contactEmail,
            contactPhone,
            logoUrl,
            createdBy: req.user._id
        };

        if (theme?.accentColor) schoolData.theme = { accentColor: theme.accentColor };

        const school = await School.create(schoolData);

        res.status(201).json({ success: true, message: "School created", data: school });
    } catch (error) {
        console.error("Create School Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSchools = async (req, res) => {
    try {
        const currentUser = req.user;
        let schools;

        if (currentUser.role === 'super_admin') {
            schools = await School.find()
                .populate('adminCount').populate('teacherCount').populate('studentCount')
                .sort({ createdAt: -1 });
        } else if (currentUser.schoolId) {
            schools = await School.find({ _id: currentUser.schoolId })
                .populate('adminCount').populate('teacherCount').populate('studentCount');
        } else {
            schools = [];
        }

        res.status(200).json({ success: true, count: schools.length, data: schools });
    } catch (error) {
        console.error("Get Schools Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSchoolById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const school = await School.findById(id)
            .populate('adminCount').populate('teacherCount').populate('studentCount');

        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        if (currentUser.role !== 'super_admin' && currentUser.schoolId?.toString() !== id) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        res.status(200).json({ success: true, data: school });
    } catch (error) {
        console.error("Get School Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, contactEmail, contactPhone, logoUrl, isActive, theme } = req.body;

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        if (name) school.name = name;
        if (address !== undefined) school.address = address;
        if (contactEmail !== undefined) school.contactEmail = contactEmail;
        if (contactPhone !== undefined) school.contactPhone = contactPhone;
        if (logoUrl !== undefined) school.logoUrl = logoUrl;
        if (isActive !== undefined) school.isActive = isActive;
        if (theme?.accentColor) school.theme.accentColor = theme.accentColor;

        await school.save();

        res.status(200).json({ success: true, message: "School updated", data: school });
    } catch (error) {
        console.error("Update School Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        const userCount = await User.countDocuments({ schoolId: id });
        if (userCount > 0) {
            return res.status(400).json({ success: false, message: `Cannot delete with ${userCount} users` });
        }

        await School.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "School deleted" });
    } catch (error) {
        console.error("Delete School Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSchoolsList = async (req, res) => {
    try {
        const schools = await School.find({ isActive: true }).select('name code _id').sort({ name: 1 });
        res.status(200).json({ success: true, data: schools });
    } catch (error) {
        console.error("Get Schools List Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const uploadSchoolLogo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const school = await School.findById(id);
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        const logoUrl = `/uploads/${req.file.filename}`;
        school.logoUrl = logoUrl;
        await school.save();

        res.status(200).json({ success: true, message: "Logo uploaded", data: { logoUrl, school } });
    } catch (error) {
        console.error("Upload School Logo Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMySchoolBranding = async (req, res) => {
    try {
        const user = req.user;

        if (!user.schoolId) {
            return res.status(200).json({ success: true, data: null });
        }

        const school = await School.findById(user.schoolId).select('name logoUrl theme');
        res.status(200).json({ success: true, data: school });
    } catch (error) {
        console.error("Get My Branding Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

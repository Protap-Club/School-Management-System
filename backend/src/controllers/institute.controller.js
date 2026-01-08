import Institute from "../models/Institute.model.js";
import User from "../models/User.model.js";

/**
 * @desc    Create new institute
 * @route   POST /api/v1/institute
 * @access  Private (SuperAdmin only)
 */
export const createInstitute = async (req, res) => {
    try {
        const { name, code, address, contactEmail, contactPhone, logoUrl } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Name and code are required"
            });
        }

        // Check if code already exists
        const existingInstitute = await Institute.findOne({ code: code.toUpperCase() });
        if (existingInstitute) {
            return res.status(409).json({
                success: false,
                message: "An institute with this code already exists"
            });
        }

        const institute = await Institute.create({
            name,
            code: code.toUpperCase(),
            address,
            contactEmail,
            contactPhone,
            logoUrl,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Institute created successfully",
            data: institute
        });
    } catch (error) {
        console.error("Create Institute Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Get all institutes (SuperAdmin) or own institute (Admin)
 * @route   GET /api/v1/institute
 * @access  Private
 */
export const getInstitutes = async (req, res) => {
    try {
        const currentUser = req.user;
        let institutes;

        if (currentUser.role === 'super_admin') {
            // SuperAdmin sees all institutes with counts
            institutes = await Institute.find()
                .populate('adminCount')
                .populate('teacherCount')
                .populate('studentCount')
                .sort({ createdAt: -1 });
        } else if (currentUser.instituteId) {
            // Other roles see only their institute
            institutes = await Institute.find({ _id: currentUser.instituteId })
                .populate('adminCount')
                .populate('teacherCount')
                .populate('studentCount');
        } else {
            institutes = [];
        }

        res.status(200).json({
            success: true,
            count: institutes.length,
            data: institutes
        });
    } catch (error) {
        console.error("Get Institutes Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Get single institute by ID
 * @route   GET /api/v1/institute/:id
 * @access  Private
 */
export const getInstituteById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const institute = await Institute.findById(id)
            .populate('adminCount')
            .populate('teacherCount')
            .populate('studentCount');

        if (!institute) {
            return res.status(404).json({
                success: false,
                message: "Institute not found"
            });
        }

        // Non-SuperAdmins can only view their own institute
        if (currentUser.role !== 'super_admin' && 
            currentUser.instituteId?.toString() !== id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(200).json({
            success: true,
            data: institute
        });
    } catch (error) {
        console.error("Get Institute Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Update institute
 * @route   PUT /api/v1/institute/:id
 * @access  Private (SuperAdmin only)
 */
export const updateInstitute = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, contactEmail, contactPhone, logoUrl, isActive } = req.body;

        const institute = await Institute.findById(id);

        if (!institute) {
            return res.status(404).json({
                success: false,
                message: "Institute not found"
            });
        }

        // Update fields
        if (name) institute.name = name;
        if (address !== undefined) institute.address = address;
        if (contactEmail !== undefined) institute.contactEmail = contactEmail;
        if (contactPhone !== undefined) institute.contactPhone = contactPhone;
        if (logoUrl !== undefined) institute.logoUrl = logoUrl;
        if (isActive !== undefined) institute.isActive = isActive;

        await institute.save();

        res.status(200).json({
            success: true,
            message: "Institute updated successfully",
            data: institute
        });
    } catch (error) {
        console.error("Update Institute Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Delete institute (soft delete)
 * @route   DELETE /api/v1/institute/:id
 * @access  Private (SuperAdmin only)
 */
export const deleteInstitute = async (req, res) => {
    try {
        const { id } = req.params;

        const institute = await Institute.findById(id);

        if (!institute) {
            return res.status(404).json({
                success: false,
                message: "Institute not found"
            });
        }

        // Check if there are users in this institute
        const userCount = await User.countDocuments({ instituteId: id });
        if (userCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete institute with ${userCount} users. Remove or transfer users first.`
            });
        }

        await Institute.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Institute deleted successfully"
        });
    } catch (error) {
        console.error("Delete Institute Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

/**
 * @desc    Get all institutes for dropdown (simple list)
 * @route   GET /api/v1/institute/list
 * @access  Private (SuperAdmin only)
 */
export const getInstitutesList = async (req, res) => {
    try {
        const institutes = await Institute.find({ isActive: true })
            .select('name code _id')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: institutes
        });
    } catch (error) {
        console.error("Get Institutes List Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

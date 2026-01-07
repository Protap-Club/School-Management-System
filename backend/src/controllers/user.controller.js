import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import AdminProfileModel from "../models/AdminProfile.model.js";

// Role creation permission map (who can create whom)
const ROLE_CREATE_MAP = {
    super_admin: ["admin", "teacher", "student"],
    admin: ["teacher", "student"],
    teacher: ["student"]
};

// Profile config for each role
const PROFILE_CONFIG = {
    admin: {
        model: AdminProfileModel,
        requiredFields: ["department"],
        extractFields: (body) => ({
            department: body.department,
            employeeId: body.employeeId,
            permissions: body.permissions || []
        })
    },
    teacher: {
        model: TeacherProfileModel,
        requiredFields: ["department", "designation"],
        extractFields: (body) => ({
            department: body.department,
            designation: body.designation,
            employeeId: body.employeeId,
            qualification: body.qualification,
            joiningDate: body.joiningDate
        })
    },
    student: {
        model: StudentProfileModel,
        requiredFields: ["rollNumber", "course", "year"],
        extractFields: (body) => ({
            rollNumber: body.rollNumber,
            course: body.course,
            year: body.year,
            section: body.section,
            guardianName: body.guardianName,
            guardianContact: body.guardianContact,
            address: body.address,
            admissionDate: body.admissionDate
        })
    }
};

// Function to create new user
const createUser = async (req, res) => {
    try {
        const { name, email, password, contactNo, targetRole } = req.body;
        const creator = req.user;

        // Students cannot create anyone
        if (creator.role === "student") {
            return res.status(403).json({
                success: false,
                message: "Access Denied"
            });
        }

        // Check if creator can create this role
        const allowedRoles = ROLE_CREATE_MAP[creator.role];
        if (!allowedRoles || !allowedRoles.includes(targetRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to create this role"
            });
        }

        // Validate common required fields
        if (!name || !email || !password || !targetRole) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and targetRole are required"
            });
        }

        // Check if email already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Get profile config for target role
        const config = PROFILE_CONFIG[targetRole];
        if (!config) {
            return res.status(400).json({
                success: false,
                message: "Invalid target role"
            });
        }

        // Validate role-specific required fields
        const missingFields = config.requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role: targetRole,
            contactNo,
            createdBy: creator._id
        });

        // Create role-specific profile
        await config.model.create({
            userId: newUser._id,
            ...config.extractFields(req.body)
        });

        return res.status(201).json({
            success: true,
            message: `${targetRole} created successfully`,
            data: {
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Create user error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Role view permission map (who can view whom)
const ROLE_VIEW_MAP = {
    super_admin: ["admin", "teacher", "student"],
    admin: ["teacher", "student"],
    teacher: ["student"]
};

// Function to get users based on logged-in user's role
const getUsers = async (req, res) => {
    try {
        const currentUser = req.user;

        // Students cannot view anyone
        if (currentUser.role === "student") {
            return res.status(403).json({
                success: false,
                message: "Access Denied"
            });
        }

        // Get allowed roles this user can view
        const allowedRoles = ROLE_VIEW_MAP[currentUser.role];
        if (!allowedRoles || allowedRoles.length === 0) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view users"
            });
        }

        // Fetch users with allowed roles
        const users = await UserModel.find({ role: { $in: allowedRoles } })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { createUser, getUsers };


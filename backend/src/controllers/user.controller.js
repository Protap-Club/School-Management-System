import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";
import AdminProfileModel from "../models/AdminProfile.model.js";
import { generatePassword } from "../utils/password.util.js";
import { sendCredentialsEmail } from "../services/email.service.js";

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
        const { name, email, contactNo, targetRole, instituteId } = req.body;
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

        // Validate common required fields (password is auto-generated now)
        if (!name || !email || !targetRole) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and targetRole are required"
            });
        }

        // Determine instituteId based on creator role
        let userInstituteId;
        if (creator.role === "super_admin") {
            // SuperAdmin must provide instituteId
            if (!instituteId) {
                return res.status(400).json({
                    success: false,
                    message: "Institute ID is required when SuperAdmin creates a user"
                });
            }
            userInstituteId = instituteId;
        } else {
            // Admin/Teacher use their own instituteId
            if (!creator.instituteId) {
                return res.status(400).json({
                    success: false,
                    message: "You must belong to an institute to create users"
                });
            }
            userInstituteId = creator.instituteId;
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

        // Auto-generate password
        const plainPassword = generatePassword(12);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        // Create user with instituteId
        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role: targetRole,
            contactNo,
            instituteId: userInstituteId,
            createdBy: creator._id,
            mustChangePassword: true
        });

        // Create role-specific profile
        await config.model.create({
            userId: newUser._id,
            ...config.extractFields(req.body)
        });

        // Send credentials email to the new user
        const emailResult = await sendCredentialsEmail({
            to: email,
            name: name,
            role: targetRole,
            password: plainPassword
        });

        return res.status(201).json({
            success: true,
            message: `${targetRole} created successfully. ${emailResult.success ? 'Credentials sent via email.' : 'Email could not be sent.'}`,
            data: {
                userId: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                instituteId: newUser.instituteId
            },
            emailSent: emailResult.success
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

// Function to get users based on logged-in user's role with pagination
const getUsers = async (req, res) => {
    try {
        const currentUser = req.user;
        const { 
            instituteId: filterInstituteId, 
            role: filterRole, 
            page = 0, 
            pageSize = 25 
        } = req.query;

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

        // Build query
        let query = {};

        // Role filter - ensure it's within allowed roles
        if (filterRole && filterRole !== 'all') {
            if (allowedRoles.includes(filterRole)) {
                query.role = filterRole;
            } else {
                return res.status(403).json({
                    success: false,
                    message: "You are not allowed to view this role"
                });
            }
        } else {
            query.role = { $in: allowedRoles };
        }

        // Institute filter for SuperAdmin
        if (currentUser.role === "super_admin") {
            if (filterInstituteId) {
                query.instituteId = filterInstituteId;
            }
            // If no institute selected, return empty for SuperAdmin (as per requirements)
        } else if (currentUser.instituteId) {
            // Non-SuperAdmin always filters by their own institute
            query.instituteId = currentUser.instituteId;
        }

        // Pagination
        const pageNum = parseInt(page) || 0;
        const limit = parseInt(pageSize) || 25;
        const skip = pageNum * limit;

        // Get total count
        const totalCount = await UserModel.countDocuments(query);

        // Fetch users with pagination
        const users = await UserModel.find(query)
            .select("-password")
            .populate('instituteId', 'name code')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page: pageNum,
                pageSize: limit,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Function to get users with their profile data
const getUsersWithProfiles = async (req, res) => {
    try {
        const currentUser = req.user;
        const { role } = req.query; // Optional filter by role

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

        // Filter by role if specified, otherwise use all allowed roles
        let targetRoles = allowedRoles;
        if (role && allowedRoles.includes(role)) {
            targetRoles = [role];
        }

        // Build query - IMPORTANT: filter by institute for non-SuperAdmin
        let query = { role: { $in: targetRoles } };
        
        if (currentUser.role !== "super_admin" && currentUser.instituteId) {
            query.instituteId = currentUser.instituteId;
        }

        // Fetch users with allowed roles and institute filter
        const users = await UserModel.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .lean();

        // Fetch profiles and attach to users
        const usersWithProfiles = await Promise.all(users.map(async (user) => {
            let profile = null;
            
            if (user.role === 'admin') {
                profile = await AdminProfileModel.findOne({ userId: user._id }).lean();
            } else if (user.role === 'teacher') {
                profile = await TeacherProfileModel.findOne({ userId: user._id }).lean();
            } else if (user.role === 'student') {
                profile = await StudentProfileModel.findOne({ userId: user._id }).lean();
            }

            return {
                ...user,
                profile: profile || null
            };
        }));

        return res.status(200).json({
            success: true,
            count: usersWithProfiles.length,
            data: usersWithProfiles
        });

    } catch (error) {
        console.error("Get users with profiles error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { createUser, getUsers, getUsersWithProfiles };


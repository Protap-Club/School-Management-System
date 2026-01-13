import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import { USER_ROLES, canManageRole, getManageableRoles } from "../constants/userRoles.js";
import { PROFILE_CONFIG } from "../constants/profileConfig.js";
import { hashPassword } from "../utils/seed.util.js";
import { sendCredentialsEmail } from "../services/email.service.js";
import { generatePassword } from "../utils/password.util.js";

const createUser = async (req, res) => {
    try {
        const { name, email, contactNo, targetRole, instituteId } = req.body;
        const creator = req.user;

        // Check if creator can manage target role
        if (!canManageRole(creator.role, targetRole)) {
            return res.status(403).json({ success: false, message: "You are not allowed to create this role" });
        }

        if (!name || !email || !targetRole) {
            return res.status(400).json({ success: false, message: "Name, email, and targetRole are required" });
        }

        // Determine institute ID based on creator's role
        let userInstituteId;
        if (creator.role === USER_ROLES.SUPER_ADMIN) {
            if (!instituteId) {
                return res.status(400).json({ success: false, message: "Institute ID is required" });
            }
            userInstituteId = instituteId;
        } else {
            if (!creator.instituteId) {
                return res.status(400).json({ success: false, message: "You must belong to an institute" });
            }
            userInstituteId = creator.instituteId;
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User with this email already exists" });
        }

        const config = PROFILE_CONFIG[targetRole];
        if (!config) {
            return res.status(400).json({ success: false, message: "Invalid target role" });
        }

        const missingFields = config.requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ success: false, message: `Missing: ${missingFields.join(", ")}` });
        }

        const plainPassword = generatePassword(12);
        const hashedPassword = await hashPassword(plainPassword);

        const newUser = await UserModel.create({
            name, email, password: hashedPassword, role: targetRole,
            contactNo, instituteId: userInstituteId, createdBy: creator._id, mustChangePassword: true
        });

        await config.model.create({ userId: newUser._id, ...config.extractFields(req.body) });

        const emailResult = await sendCredentialsEmail({ to: email, name, role: targetRole, password: plainPassword });

        return res.status(201).json({
            success: true,
            message: `${targetRole} created. ${emailResult.success ? 'Credentials sent.' : 'Email failed.'}`,
            data: { userId: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, instituteId: newUser.instituteId },
            emailSent: emailResult.success
        });
    } catch (error) {
        console.error("Create user error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getUsers = async (req, res) => {
    try {
        const currentUser = req.user;
        const { instituteId: filterInstituteId, role: filterRole, page = 0, pageSize = 25 } = req.query;

        const allowedRoles = getManageableRoles(currentUser.role);
        if (!allowedRoles?.length) {
            return res.status(403).json({ success: false, message: "Not allowed to view users" });
        }

        let query = {};

        if (filterRole && filterRole !== 'all') {
            if (allowedRoles.includes(filterRole)) {
                query.role = filterRole;
            } else {
                return res.status(403).json({ success: false, message: "Not allowed to view this role" });
            }
        } else {
            query.role = { $in: allowedRoles };
        }

        if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
            if (filterInstituteId) query.instituteId = filterInstituteId;
        } else if (currentUser.instituteId) {
            query.instituteId = currentUser.instituteId;
        }

        const pageNum = parseInt(page) || 0;
        const limit = parseInt(pageSize) || 25;
        const skip = pageNum * limit;

        const totalCount = await UserModel.countDocuments(query);
        const users = await UserModel.find(query)
            .select("-password")
            .populate('instituteId', 'name code')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            success: true,
            data: users,
            pagination: { page: pageNum, pageSize: limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
        });
    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getUsersWithProfiles = async (req, res) => {
    try {
        const currentUser = req.user;
        const { role } = req.query;

        const allowedRoles = getManageableRoles(currentUser.role);
        if (!allowedRoles?.length) {
            return res.status(403).json({ success: false, message: "Not allowed to view users" });
        }

        let targetRoles = allowedRoles;
        if (role && allowedRoles.includes(role)) targetRoles = [role];

        let query = { role: { $in: targetRoles } };
        if (currentUser.role !== USER_ROLES.SUPER_ADMIN && currentUser.instituteId) {
            query.instituteId = currentUser.instituteId;
        }

        const users = await UserModel.find(query).select("-password").sort({ createdAt: -1 }).lean();

        const usersWithProfiles = await Promise.all(users.map(async (user) => {
            const config = PROFILE_CONFIG[user.role];
            const profile = config ? await config.model.findOne({ userId: user._id }).lean() : null;
            return { ...user, profile };
        }));

        return res.status(200).json({ success: true, count: usersWithProfiles.length, data: usersWithProfiles });
    } catch (error) {
        console.error("Get users with profiles error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { createUser, getUsers, getUsersWithProfiles };

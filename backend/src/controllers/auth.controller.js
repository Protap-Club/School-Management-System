import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { conf } from "../config/index.js";
import { USER_ROLES } from "../constants/userRoles.js";

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide email and password" });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (user.role === USER_ROLES.STUDENT) {
            return res.status(403).json({ success: false, message: "Students cannot access this portal" });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: "Account deactivated" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = jwt.sign({ id: user._id }, conf.JWT_SECRET, { expiresIn: "7d" });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({ success: true, token, user: userResponse });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkAuthStatus = async (req, res) => {
    try {
        res.status(200).json({ success: true, user: req.user });
    } catch (error) {
        console.error("Check Auth Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

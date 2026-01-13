/**
 * Auth Controller - HTTP layer for authentication
 */

import * as authService from "../services/auth.service.js";

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({ success: true, token: result.token, user: result.user });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const checkAuthStatus = async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
};

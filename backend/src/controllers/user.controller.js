/**
 * User Controller - HTTP layer for user management
 */

import * as userService from "../services/user.service.js";

export const createUser = async (req, res) => {
    try {
        const result = await userService.createUser(req.user, req.body);
        res.status(201).json({
            success: true,
            message: `User created. ${result.emailSent ? 'Credentials sent.' : 'Email failed.'}`,
            data: result.user,
            emailSent: result.emailSent
        });
    } catch (error) {
        console.error("Create User Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getUsers = async (req, res) => {
    try {
        const { schoolId, role } = req.query;
        const { page, pageSize } = req.query;

        const result = await userService.getUsers(req.user, { schoolId, role }, { page, pageSize });
        res.status(200).json({ success: true, data: result.users, pagination: result.pagination });
    } catch (error) {
        console.error("Get Users Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const getUsersWithProfiles = async (req, res) => {
    try {
        const users = await userService.getUsersWithProfiles(req.user, req.query.role);
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        console.error("Get Users With Profiles Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

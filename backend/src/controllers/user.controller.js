// User Controller - HTTP layer for user management
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

// Archive & Delete Controllers

// Archive (soft delete) a single user
//  PUT /user/archive/:id

export const archiveUser = async (req, res) => {
    try {
        const result = await userService.softDeleteUser(req.user, req.params.id);
        res.status(200).json({
            success: true,
            message: "User archived successfully",
            data: result.user
        });
    } catch (error) {
        console.error("Archive User Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

//  Archive (soft delete) multiple users
//  PUT /user/archive-bulk
//  Body: { userIds: ["id1", "id2", ...] }

export const archiveUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        const result = await userService.softDeleteUsers(req.user, userIds);
        res.status(200).json({
            success: true,
            message: `Archived ${result.archived.length} user(s)`,
            data: {
                archived: result.archived,
                failed: result.failed
            }
        });
    } catch (error) {
        console.error("Archive Users Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

//  Permanently delete a single user (only archived users)
//  DELETE /user/delete/:id

export const deleteUser = async (req, res) => {
    try {
        const result = await userService.hardDeleteUser(req.user, req.params.id);
        res.status(200).json({
            success: true,
            message: "User permanently deleted",
            data: result.user
        });
    } catch (error) {
        console.error("Delete User Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// Permanently delete multiple users (only archived users)
//  DELETE /user/delete-bulk
//  Body: { userIds: ["id1", "id2", ...] }

export const deleteUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        const result = await userService.hardDeleteUsers(req.user, userIds);
        res.status(200).json({
            success: true,
            message: `Permanently deleted ${result.deleted.length} user(s)`,
            data: {
                deleted: result.deleted,
                failed: result.failed
            }
        });
    } catch (error) {
        console.error("Delete Users Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// Restore an archived user
// PUT /user/restore/:id

export const restoreUser = async (req, res) => {
    try {
        const result = await userService.restoreUser(req.user, req.params.id);
        res.status(200).json({
            success: true,
            message: "User restored successfully",
            data: result.user
        });
    } catch (error) {
        console.error("Restore User Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

//  Get archived users with pagination
//  GET /user/archived?schoolId=xxx&role=yyy&page=0&pageSize=25

export const getArchivedUsers = async (req, res) => {
    try {
        const { schoolId, role, page, pageSize } = req.query;
        const result = await userService.getArchivedUsers(req.user, { schoolId, role }, { page, pageSize });
        res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        console.error("Get Archived Users Error:", error.message);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

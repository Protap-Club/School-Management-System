import * as userService from "./user.service.js";
import asyncHandler from "../../utils/asyncHandler.js"; // Wrapper for async route handlers
import logger from "../../config/logger.js"; // Import the logger
import { BadRequestError } from "../../utils/customError.js";

// Create a new user with associated profile
export const createUser = asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.user, req.body);
    res.status(201).json({
        success: true,
        message: "User created",
        data: result
    });
    logger.info(`User created: ${result.user.email}`);
});

// Get list of users (filters handled by service)
// Get list of users (filters handled by service)
export const getUsers = asyncHandler(async (req, res) => {
    const filters = { ...req.query };
    if (req.params.id) {
        filters.userIds = req.params.id;
    }
    const result = await userService.getUsers(req.user, filters);

    // If getting single user by ID, return just that user object (or 404 handled by service/empty list check)
    if (req.params.id) {
        if (result.users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, data: result.users[0] });
    }

    res.status(200).json({
        success: true,
        data: result
    });
});

// Toggle user archive status (bulk and single supported)
export const toggleUserStatus = asyncHandler(async (req, res) => {
    const { userIds, isArchived } = req.body;
    const ids = Array.isArray(userIds) ? userIds : [req.params.id];
    const archivedStatus = isArchived !== undefined ? isArchived : (req.path.includes('archive'));

    const result = await userService.toggleUserStatus(req.user, ids, archivedStatus);
    res.status(200).json({
        success: true,
        message: `Users ${archivedStatus ? 'archived' : 'restored'}`,
        data: result
    });
    logger.info(`User status toggled: ${ids.length} users, archived=${archivedStatus}`);
});

// Permanently delete users (bulk and single supported)
export const hardDeleteUsers = asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.userIds) ? req.body.userIds : [req.params.id];
    const result = await userService.hardDeleteUsers(req.user, ids);
    res.status(200).json({
        success: true,
        message: "Users permanently deleted",
        data: result
    });
    logger.info(`Users deleted permanently: ${result.deleteResult.deletedCount}`);
});

// Upload user avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");
    // Cloudinary returns the full URL in req.file.path
    const avatarUrl = req.file.path;
    const result = await userService.updateAvatar(req.user._id, avatarUrl);
    res.status(200).json({ 
        success: true, 
        message: "Avatar uploaded", 
        data: result 
    });
    logger.info(`Avatar uploaded for user: ${req.user._id}`);
});

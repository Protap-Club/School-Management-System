import * as userService from "./user.service.js";
import asyncHandler from "../../utils/asyncHandler.js"; // Wrapper for async route handlers
import logger from "../../config/logger.js"; // Import the logger

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
export const getUsers = asyncHandler(async (req, res) => {
    const filters = { ...req.query };
    const result = await userService.getUsers(req.user, filters);

    res.status(200).json({
        success: true,
        data: result
    });
});

// Get a single user by ID
export const getUserById = asyncHandler(async (req, res) => {
    const result = await userService.getUserById(req.user, req.params.id);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Get my own profile (for mobile — teacher/student self-view)
export const getMyProfile = asyncHandler(async (req, res) => {
    const result = await userService.getMyProfile(req.user._id);
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

// Permanently delete a single user
export const hardDeleteUser = asyncHandler(async (req, res) => {
    const result = await userService.hardDeleteUsers(req.user, [req.params.id]);
    logger.info(`User deleted permanently: ${req.params.id}`);
    res.status(204).end();
});

// Permanently delete users in bulk
export const batchDeleteUsers = asyncHandler(async (req, res) => {
    const ids = req.body.userIds;
    const result = await userService.hardDeleteUsers(req.user, ids);
    logger.info(`Users deleted permanently: ${result.deleteResult.deletedCount}`);
    res.status(204).end();
});

export const userProfile = asyncHandler(async (req, res) => {
    const { _id: userId, role, schoolId } = req.user;
    const platform = req.platform;

    const result = await userService.getMyProfile(userId, role, schoolId, platform);

    logger.info(`User profile fetched successfully | userId: ${userId} | role: ${role} | platform: ${platform}`);

    res.status(200).json({
        success: true,
        data: result
    });
});

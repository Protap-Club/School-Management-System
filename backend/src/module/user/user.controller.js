import * as userService from "./user.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/customError.js";

// Create a new user with associated profile
export const createUser = asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.user, req.body);
    logger.info(`User created: ${result.user.email}`);
    res.status(201).json({
        success: true,
        message: "User created successfully",
        data: result
    });
});

// Get list of users (filtered by role, school, pagination)
export const getUsers = asyncHandler(async (req, res) => {
    const result = await userService.getUsers(req.user, { ...req.query });
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

// Get own profile (accessible from both web and mobile)
export const getMyProfile = asyncHandler(async (req, res) => {
    const result = await userService.getMyProfile(req.user._id);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Toggle user archive status (soft delete / restore)
export const toggleArchive = asyncHandler(async (req, res) => {
    const { userIds, isArchived } = req.body;
    const result = await userService.toggleArchive(req.user, userIds, isArchived);
    logger.info(`User archive toggled: ${userIds.length} users, archived=${isArchived}`);
    res.status(200).json({
        success: true,
        message: `Users ${isArchived ? 'archived' : 'restored'} successfully`,
        data: result
    });
});

// Permanently delete a single user (must be archived first)
// NOTE: Hard delete routes are commented out for now. Keep this handler for future use.
export const hardDeleteUser = asyncHandler(async (req, res) => {
    await userService.hardDeleteUsers(req.user, [req.params.id]);
    logger.info(`User permanently deleted: ${req.params.id}`);
    res.status(204).end();
});

// Permanently delete users in bulk (must be archived first)
// NOTE: Hard delete routes are commented out for now. Keep this handler for future use.
export const batchDeleteUsers = asyncHandler(async (req, res) => {
    const result = await userService.hardDeleteUsers(req.user, req.body.userIds);
    logger.info(`Users permanently deleted: ${result.deletedCount}`);
    res.status(204).end();
});

// Upload user avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");

    const avatarUrl = req.file.path || req.file.secure_url || req.file.url;
    const avatarPublicId = req.file.filename || req.file.public_id;

    const result = await userService.updateAvatar(req.user._id, avatarUrl, avatarPublicId);
    logger.info(`Avatar uploaded for user: ${req.user._id}`);
    res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: result
    });
});

export const userProfile = asyncHandler(async (req, res) => {
    const { _id: userId, role, schoolId } = req.user;
    const platform = req.platform;

    const result = await userService.getMyProfile(userId, role, schoolId, platform);

    logger.info(`User profile fetched successfully | userId: ${userId} | role: ${role} | platform: ${platform}`);

    res.status(200).json({
        success: true,
        message: "User Profile Fetched Successfully",
        data: result
    });
});

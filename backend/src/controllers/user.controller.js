// User Controller - Handles HTTP requests for user management.
// This includes creating, retrieving, archiving, deleting, and restoring user accounts.

import * as userService from "../services/user.service.js";
import asyncHandler from "../utils/asyncHandler.js"; // Wrapper for async route handlers
import logger from "../config/logger.js"; // Import the logger

/**
 * Creates a new user with an associated profile.
 * POST /api/v1/user
 */
export const createUser = asyncHandler(async (req, res) => {
    logger.info(`Received request to create user by ${req.user._id} for email: ${req.body.email}`);
    
    const result = await userService.createUser(req.user, req.body);
    
    res.status(201).json({
        success: true,
        message: `User created. ${result.emailSent ? 'Credentials sent.' : 'Email failed.'}`,
        data: result.user,
        emailSent: result.emailSent
    });
    logger.info(`User ${result.user.userId} created successfully. Email sent status: ${result.emailSent}`);
});

/**
 * Retrieves a list of users, with filtering and pagination options.
 * GET /api/v1/user
 */
export const getUsers = asyncHandler(async (req, res) => {
    logger.info(`Received request to get users by ${req.user._id} with query: %o`, req.query);
    
    const { schoolId, role } = req.query;
    const { page, pageSize } = req.query;

    const result = await userService.getUsers(req.user, { schoolId, role }, { page, pageSize });
    
    res.status(200).json({ success: true, data: result.users, pagination: result.pagination });
    logger.info(`Fetched ${result.users.length} users (total: ${result.pagination.totalCount}) for user ${req.user._id}.`);
});

/**
 * Retrieves a list of users along with their detailed profiles.
 * GET /api/v1/user/with-profiles
 */
export const getUsersWithProfiles = asyncHandler(async (req, res) => {
    logger.info(`Received request to get users with profiles by ${req.user._id} for role: ${req.query.role || 'all'}`);
    
    const users = await userService.getUsersWithProfiles(req.user, req.query.role);
    
    res.status(200).json({ success: true, count: users.length, data: users });
    logger.info(`Fetched ${users.length} users with profiles for user ${req.user._id}.`);
});

// ═══════════════════════════════════════════════════════════════
// Archive & Delete Controllers
// ═══════════════════════════════════════════════════════════════

/**
 * Archives (soft deletes) a single user.
 * PUT /api/v1/user/archive/:id
 */
export const archiveUser = asyncHandler(async (req, res) => {
    logger.info(`Received request to archive user ID: ${req.params.id} by ${req.user._id}`);
    
    // Call the consolidated service function with a single user ID.
    const result = await userService.softDeleteUsers(req.user, req.params.id);
    
    res.status(200).json({
        success: true,
        message: "User archived successfully",
        data: result.archived[0] // The result is now an array.
    });
    logger.info(`User ${req.params.id} archived successfully by ${req.user._id}.`);
});

/**
 * Archives (soft deletes) multiple users in a bulk operation.
 * PUT /api/v1/user/archive-bulk
 */
export const archiveUsers = asyncHandler(async (req, res) => {
    logger.info(`Received request for bulk archive of users by ${req.user._id} for IDs: %o`, req.body.userIds);
    
    const { userIds } = req.body;
    // Call the consolidated service function with an array of user IDs.
    const result = await userService.softDeleteUsers(req.user, userIds);
    
    res.status(200).json({
        success: true,
        message: `Archived ${result.archived.length} user(s).`,
        data: {
            archived: result.archived,
            failed: result.failed
        }
    });
    logger.info(`Bulk archive completed by ${req.user._id}. Archived: ${result.archived.length}, Failed: ${result.failed.length}.`);
});

/**
 * Permanently deletes a single user. Only archived users can be hard deleted.
 * DELETE /api/v1/user/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
    logger.info(`Received request to permanently delete user ID: ${req.params.id} by ${req.user._id}`);
    
    // Call the consolidated service function with a single user ID.
    const result = await userService.hardDeleteUsers(req.user, req.params.id);
    
    res.status(200).json({
        success: true,
        message: "User permanently deleted",
        data: result.deleted[0] // The result is now an array.
    });
    logger.info(`User ${req.params.id} permanently deleted by ${req.user._id}.`);
});

/**
 * Permanently deletes multiple users in a bulk operation. Only archived users can be hard deleted.
 * DELETE /api/v1/user/bulk
 */
export const deleteUsers = asyncHandler(async (req, res) => {
    logger.info(`Received request for bulk permanent delete of users by ${req.user._id} for IDs: %o`, req.body.userIds);
    
    const { userIds } = req.body;
    // Call the consolidated service function with an array of user IDs.
    const result = await userService.hardDeleteUsers(req.user, userIds);
    
    res.status(200).json({
        success: true,
        message: `Permanently deleted ${result.deleted.length} user(s).`,
        data: {
            deleted: result.deleted,
            failed: result.failed
        }
    });
    logger.info(`Bulk permanent delete completed by ${req.user._id}. Deleted: ${result.deleted.length}, Failed: ${result.failed.length}.`);
});

/**
 * Restores an archived user, making them active again.
 * PUT /api/v1/user/restore/:id
 */
export const restoreUser = asyncHandler(async (req, res) => {
    logger.info(`Received request to restore user ID: ${req.params.id} by ${req.user._id}`);
    
    // Call the consolidated service function with a single user ID.
    const result = await userService.restoreUser(req.user, req.params.id);
    
    res.status(200).json({
        success: true,
        message: "User restored successfully",
        data: result.restored[0] // The result is now an array.
    });
    logger.info(`User ${req.params.id} restored successfully by ${req.user._id}.`);
});

/**
 * Restores multiple archived users in a bulk operation.
 * PUT /api/v1/user/restore-bulk
 */
export const restoreUsers = asyncHandler(async (req, res) => {
    logger.info(`Received request for bulk restore of users by ${req.user._id} for IDs: %o`, req.body.userIds);

    const { userIds } = req.body;
    const result = await userService.restoreUser(req.user, userIds);

    res.status(200).json({
        success: true,
        message: `Restored ${result.restored.length} user(s).`,
        data: {
            restored: result.restored,
            failed: result.failed
        }
    });
    logger.info(`Bulk restore completed by ${req.user._id}. Restored: ${result.restored.length}, Failed: ${result.failed.length}.`);
});

/**
 * Retrieves a paginated list of archived users, with filtering options.
 * GET /api/v1/user/archived
 */
export const getArchivedUsers = asyncHandler(async (req, res) => {
    logger.info(`Received request to get archived users by ${req.user._id} with query: %o`, req.query);
    
    const { schoolId, role, page, pageSize } = req.query;
    const result = await userService.getArchivedUsers(req.user, { schoolId, role }, { page, pageSize });
    
    res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination
    });
    logger.info(`Fetched ${result.users.length} archived users (total: ${result.pagination.totalCount}) for user ${req.user._id}.`);
});

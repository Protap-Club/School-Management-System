import * as userService from "./user.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { BadRequestError } from "../../utils/customError.js";

const getMetadata = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

// Create a new user with associated profile
export const createUser = asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.user, req.body, getMetadata(req));

    // Service detected a class-teacher conflict — ask the frontend to confirm
    if (result.conflict) {
        return res.status(409).json({
            success: false,
            conflict: true,
            code: "CLASS_TEACHER_ALREADY_ASSIGNED",
            message: "Teacher-class assignment conflict detected",
            conflicts: result.conflicts,
        });
    }

    logger.info(`User created: ${result.user.email}`);
    res.status(201).json({
        success: true,
        message: "User created successfully",
        data: result
    });
});

export const createTeacherStudent = asyncHandler(async (req, res) => {
    const result = await userService.createTeacherStudent(req.user, req.body, getMetadata(req));

    logger.info(`Teacher-created student: ${result.user.email}`);
    res.status(201).json({
        success: true,
        message: "Student created successfully",
        data: result,
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

// Update a user (admin/super admin)
export const updateUser = asyncHandler(async (req, res) => {
    const result = await userService.updateUser(req.user, req.params.id, req.body, getMetadata(req));

    // Service detected a class-teacher conflict — ask the frontend to confirm
    if (result?.conflict) {
        return res.status(409).json({
            success: false,
            conflict: true,
            code: "CLASS_TEACHER_ALREADY_ASSIGNED",
            message: "Teacher-class assignment conflict detected",
            conflicts: result.conflicts,
        });
    }

    res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: { user: result }
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

export const toggleArchive = asyncHandler(async (req, res) => {
    const { userIds, isArchived, replacementTeacherId, skipReplacement } = req.body;
    const result = await userService.toggleArchive(req.user, userIds, isArchived, {
        replacementTeacherId,
        skipReplacement,
        metadata: getMetadata(req)
    });
    logger.info(`User archive toggled: ${userIds.length} users, archived=${isArchived}`);
    res.status(200).json({
        success: true,
        message: `Users ${isArchived ? 'archived' : 'restored'} successfully`,
        data: result
    });
});

// Upload user avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError("No file uploaded");

    const avatarUrl = req.file.path || req.file.secure_url || req.file.url;
    const avatarPublicId = req.file.filename || req.file.public_id;

    const result = await userService.updateAvatar(req.user._id, avatarUrl, avatarPublicId, getMetadata(req));
    logger.info(`Avatar uploaded for user: ${req.user._id}`);
    res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: result
    });
});

export const updateTeacherProfile = asyncHandler(async (req, res) => {
    const result = await userService.updateTeacherProfile(req.user, req.params.id, req.body, getMetadata(req));

    // Service detected a class-teacher conflict — ask the frontend to confirm
    if (result?.conflict) {
        return res.status(409).json({
            success: false,
            conflict: true,
            code: "CLASS_TEACHER_ALREADY_ASSIGNED",
            message: "Teacher-class assignment conflict detected",
            conflicts: result.conflicts,
        });
    }

    res.status(200).json({
        success: true,
        message: "Teacher profile updated successfully",
        data: result
    });
});

export const replaceClassTeacher = asyncHandler(async (req, res) => {
    const result = await userService.replaceClassTeacher(req.user, req.body, getMetadata(req));
    res.status(200).json({
        success: true,
        message: "Class teacher replaced successfully",
        data: result
    });
});

export const getSubjectTeacher = asyncHandler(async (req, res) => {
    const { standard, section, subject } = req.query;
    const result = await userService.getSubjectTeacher(req.user, standard, section, subject);
    res.status(200).json({
        success: true,
        data: result
    });
});

export const getNextRollNumber = asyncHandler(async (req, res) => {
    const { standard, section } = req.query;
    const result = await userService.getNextRollNumber(req.user, standard, section);
    res.status(200).json({
        success: true,
        data: result
    });
});

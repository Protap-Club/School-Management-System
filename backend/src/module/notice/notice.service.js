import mongoose from "mongoose";
import { Notice, NoticeGroup } from "./Notice.model.js";
import { CustomError } from "../../utils/customError.js";
import logger from "../../config/logger.js";

// ═══════════════════════════════════════════════════════════════
// Notice Service
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new notice
 */
export const createNotice = async (schoolId, userId, data, file = null) => {
    // Parse recipients from JSON string (sent via FormData)
    let recipients = [];
    try {
        recipients = typeof data.recipients === 'string'
            ? JSON.parse(data.recipients)
            : (data.recipients || []);
    } catch {
        throw new CustomError("Invalid recipients format", 400);
    }

    // Determine notice type based on attachment
    const type = file ? 'file' : 'notice';

    // Build attachment object if file exists
    let attachment = undefined;
    if (file) {
        attachment = {
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/notices/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype,
        };
    }

    const notice = await Notice.create({
        schoolId,
        createdBy: userId,
        title: data.title || "",
        message: data.message,
        type,
        recipientType: data.recipientType,
        recipients,
        attachment,
        status: "sent",
    });

    // Populate createdBy for response
    await notice.populate("createdBy", "name email role");

    logger.info(`Notice created: ${notice._id} by user ${userId}`);
    return notice;
};

/**
 * Get notices with filters
 */
export const getNotices = async (schoolId, filters = {}) => {
    const query = { schoolId, isActive: true };

    // Type filter
    if (filters.type && filters.type !== 'all') {
        query.type = filters.type;
    }

    // SentTo filter
    if (filters.sentTo && filters.sentTo !== 'all') {
        if (filters.sentTo === 'group') {
            query.recipientType = { $in: ['all', 'classes', 'groups'] };
        } else if (filters.sentTo === 'individual') {
            query.recipientType = { $in: ['users', 'students'] };
        }
    }

    // Date filter
    if (filters.date && filters.date !== 'all') {
        const now = new Date();
        let dateFrom;

        if (filters.date === 'today') {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (filters.date === 'last7') {
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (filters.date === 'last30') {
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        if (dateFrom) {
            query.createdAt = { $gte: dateFrom };
        }
    }

    const notices = await Notice.find(query)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .lean();

    return notices;
};

/**
 * Get a single notice by ID
 */
export const getNoticeById = async (schoolId, noticeId) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new CustomError("Invalid notice ID", 400);
    }

    const notice = await Notice.findOne({
        _id: noticeId,
        schoolId,
        isActive: true,
    })
        .populate("createdBy", "name email role")
        .lean();

    if (!notice) {
        throw new CustomError("Notice not found", 404);
    }

    return notice;
};

/**
 * Soft-delete a notice
 */
export const deleteNotice = async (schoolId, noticeId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new CustomError("Invalid notice ID", 400);
    }

    const notice = await Notice.findOneAndUpdate(
        { _id: noticeId, schoolId, isActive: true },
        { isActive: false },
        { new: true }
    );

    if (!notice) {
        throw new CustomError("Notice not found", 404);
    }

    logger.info(`Notice deleted: ${noticeId} by user ${userId}`);
    return notice;
};

// ═══════════════════════════════════════════════════════════════
// Group Service
// ═══════════════════════════════════════════════════════════════

/**
 * Get all groups for a user within a school
 */
export const getGroups = async (schoolId, userId) => {
    const groups = await NoticeGroup.find({
        schoolId,
        createdBy: userId,
        isActive: true,
    })
        .populate("members", "name email role")
        .sort({ createdAt: -1 })
        .lean();

    return groups;
};

/**
 * Create a new notice group
 */
export const createGroup = async (schoolId, userId, data) => {
    // Check for duplicate group name
    const existing = await NoticeGroup.findOne({
        schoolId,
        createdBy: userId,
        name: data.name,
        isActive: true,
    });

    if (existing) {
        throw new CustomError("A group with this name already exists", 409);
    }

    const group = await NoticeGroup.create({
        schoolId,
        createdBy: userId,
        name: data.name,
        members: data.students, // Array of user ObjectIds
    });

    // Populate members for response
    await group.populate("members", "name email role");

    logger.info(`NoticeGroup created: ${group._id} by user ${userId}`);
    return group;
};

/**
 * Soft-delete a notice group
 */
export const deleteGroup = async (schoolId, groupId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new CustomError("Invalid group ID", 400);
    }

    const group = await NoticeGroup.findOneAndUpdate(
        { _id: groupId, schoolId, createdBy: userId, isActive: true },
        { isActive: false },
        { new: true }
    );

    if (!group) {
        throw new CustomError("Group not found or access denied", 404);
    }

    logger.info(`NoticeGroup deleted: ${groupId} by user ${userId}`);
    return group;
};

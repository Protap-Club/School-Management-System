import mongoose from "mongoose";
import { Notice, NoticeGroup } from "./Notice.model.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";

// NOTICE SERVICES

// Create a new notice
export const createNotice = async (schoolId, userId, data, file) => {
    // Parse recipients (sent as JSON string from FormData)
    const recipients = typeof data.recipients === 'string'
        ? JSON.parse(data.recipients)
        : (data.recipients || []);

    // Build attachment if file exists
    const attachment = file ? {
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/notices/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
    } : null;

    const notice = await Notice.create({
        schoolId,
        createdBy: userId,
        title: data.title || "",
        message: data.message,
        recipients,
        attachment,
    });

    await notice.populate("createdBy", "name email role");
    logger.info(`Notice created: ${notice._id}`);

    return notice;
};

// Get notices (Unified — platform branching like attendance.service.js)
export const getNotices = async (user, platform, filters = {}) => {
    const schoolId = user.schoolId?._id || user.schoolId;
    const userId = user._id;

    logger.info("Notice retrieval request", { userId, role: user.role, platform });

    // Platform-specific logic
    if (platform === 'mobile') {
        if (user.role === USER_ROLES.STUDENT) {
            return await getStudentMobileNotices(schoolId, userId);
        } else if (user.role === USER_ROLES.TEACHER) {
            return await getTeacherMobileNotices(schoolId, userId);
        } else {
            // ADMIN or others restricted on mobile notice view
            throw new ForbiddenError("Only students and teachers can access mobile notices");
        }
    }

    // Web/Default: Returns notices created by the user (history)
    const query = { schoolId, createdBy: userId };

    // Date filter
    if (filters.date && filters.date !== 'all') {
        const now = new Date();
        const dateMap = {
            today: new Date(now.setHours(0, 0, 0, 0)),
            last7: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            last30: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };

        if (dateMap[filters.date]) {
            query.createdAt = { $gte: dateMap[filters.date] };
        }
    }

    return await Notice.find(query)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .lean();
};

// Get notices received by a user
export const getReceivedNotices = async (schoolId, userId) => {
    return await Notice.find({
        schoolId,
        createdBy: { $ne: userId },
        $or: [
            { recipients: { $size: 0 } },  // Sent to all
            { recipients: userId }          // Sent to me
        ],
    })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
};

// Get a single notice by ID
export const getNoticeById = async (schoolId, noticeId) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new BadRequestError("Invalid notice ID");
    }

    const notice = await Notice.findOne({ _id: noticeId, schoolId })
        .populate("createdBy", "name email role")
        .lean();

    if (!notice) {
        throw new NotFoundError("Notice not found");
    }

    return notice;
};

// Permanently delete a notice
export const deleteNotice = async (schoolId, noticeId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new BadRequestError("Invalid notice ID");
    }

    const notice = await Notice.findOneAndDelete({
        _id: noticeId,
        schoolId,
        createdBy: userId  // Only creator can delete
    });

    if (!notice) {
        throw new NotFoundError("Notice not found");
    }

    logger.info(`Notice deleted: ${noticeId}`);
    return notice;
};


// GROUP SERVICES

// Get all groups created by a user
export const getGroups = async (schoolId, userId) => {
    return await NoticeGroup.find({
        schoolId,
        createdBy: userId,
        isActive: true,
    })
        .populate("members", "name email role")
        .sort({ createdAt: -1 })
        .lean();
};

// Create a saved group
export const createGroup = async (schoolId, userId, data) => {
    // Check for duplicate group name
    const existing = await NoticeGroup.findOne({
        schoolId,
        createdBy: userId,
        name: data.name,
        isActive: true,
    });

    if (existing) {
        throw new ConflictError("A group with this name already exists");
    }

    const group = await NoticeGroup.create({
        schoolId,
        createdBy: userId,
        name: data.name,
        members: data.students,
    });

    await group.populate("members", "name email role");
    logger.info(`Group created: ${group._id}`);

    return group;
};

// Soft-delete a group
export const deleteGroup = async (schoolId, groupId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
        throw new BadRequestError("Invalid group ID");
    }

    const group = await NoticeGroup.findOneAndUpdate(
        { _id: groupId, schoolId, createdBy: userId, isActive: true },
        { isActive: false },
        { new: true }
    );

    if (!group) {
        throw new NotFoundError("Group not found");
    }

    logger.info(`Group deleted: ${groupId}`);
    return group;
};

// ─── MOBILE HELPERS ─────────────────────────────────────────────

// STUDENT: Returns only received notices
const getStudentMobileNotices = async (schoolId, userId) => {
    return await getReceivedNotices(schoolId, userId);
};

// TEACHER: Returns received + history (sent) notices
const getTeacherMobileNotices = async (schoolId, userId) => {
    const received = await getReceivedNotices(schoolId, userId);
    const history = await Notice.find({ schoolId, createdBy: userId })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(20) // Limit mobile history to recent 20
        .lean();

    return { received, history };
};
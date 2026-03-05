import mongoose from "mongoose";
import { Notice, NoticeGroup } from "./Notice.model.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import cloudinary from "../../config/cloudinary.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";

/**
 * Generates a private, short-lived download URL for a Cloudinary raw resource.
 *
 * WHY private_download_url instead of cloudinary.url()?
 * - cloudinary.url() generates CDN URLs. For raw resources, Cloudinary's CDN
 *   enforces access control regardless of the sign_url flag, returning 401.
 * - cloudinary.utils.private_download_url() generates an API-level URL that
 *   embeds authentication in the query string (timestamp + signature). This
 *   bypasses CDN restrictions entirely and works for ALL private raw files.
 *
 * Falls back to the stored secure_url if public_id is missing.
 */
const getSignedUrl = (attachment) => {
    if (!attachment) return null;
    try {
        const storedUrl = attachment.secure_url || attachment.path;
        if (!storedUrl) return null;

        // If it's not a Cloudinary URL, return as is
        if (!storedUrl.includes('res.cloudinary.com')) return storedUrl;

        // Detect resource type from URL
        let resourceType = 'raw';
        if (storedUrl.includes('/image/upload/')) resourceType = 'image';
        if (storedUrl.includes('/video/upload/')) resourceType = 'video';

        let publicId = attachment.public_id || attachment.filename;
        
        // If publicId is missing, try to extract it from URL
        if (!publicId) {
            const match = storedUrl.match(new RegExp(`\\/${resourceType}\\/upload\\/(?:v\\d+\\/)?(.+)$`));
            if (match && match[1]) publicId = match[1];
        }

        if (!publicId) return storedUrl;

        // Extract extension
        const ext = publicId.split('.').pop().toLowerCase();

        // Standardize: always generate a signed download URL for raw components to be safe
        // For private assets, this is the only way to avoid 401/403.
        return cloudinary.utils.private_download_url(publicId, ext, {
            resource_type: resourceType,
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        });
    } catch (err) {
        logger.warn(`Failed to generate signed download URL: ${err.message}`);
        return attachment.secure_url || attachment.path;
    }
};

/**
 * Enriches a notice (or array of notices) by replacing the attachment URL
 * with a freshly signed URL so the client can open/download the file.
 */
const enrichWithSignedUrls = (notices) => {
    if (Array.isArray(notices)) {
        return notices.map(n => {
            if (n.attachment) {
                n.attachment = { ...n.attachment, secure_url: getSignedUrl(n.attachment) };
            }
            return n;
        });
    }
    // Single notice
    if (notices?.attachment) {
        notices.attachment = { ...notices.attachment, secure_url: getSignedUrl(notices.attachment) };
    }
    return notices;
};

// NOTICE SERVICES

// Create a new notice
export const createNotice = async (schoolId, userId, data, file) => {
    // Parse recipients (sent as JSON string from FormData)
    const recipients = typeof data.recipients === 'string'
        ? JSON.parse(data.recipients)
        : (data.recipients || []);

    // Build attachment if file exists
    // Cloudinary returns the full URL in file.path/secure_url and public_id in file.filename/public_id
    let attachment = null;
    if (file) {
        const fileUrl = file.path || file.secure_url || file.url;
        const filePublicId = file.filename || file.public_id;

        console.log(`[DEBUG] Notice attachment extracted - URL: ${fileUrl}, PublicID: ${filePublicId}`);

        attachment = {
            filename: filePublicId,
            originalName: file.originalname,
            path: fileUrl,
            secure_url: fileUrl,
            public_id: filePublicId,
            size: file.size,
            mimetype: file.mimetype,
        };
    }

    const notice = await Notice.create({
        schoolId,
        createdBy: userId,
        title: data.title || "",
        message: data.message,
        recipientType: data.recipientType,
        type: attachment ? "file" : "notice",
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
            return await getStudentMobileNotices(schoolId, user);
        } else if (user.role === USER_ROLES.TEACHER) {
            return await getTeacherMobileNotices(schoolId, user);
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

    const results = await Notice.find(query)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .lean();

    return enrichWithSignedUrls(results);
};

// Get notices received by a user
export const getReceivedNotices = async (schoolId, user) => {
    const userId = user._id;
    const role = user.role;

    // 1. Gather all target strings/IDs the user is a part of
    const targetRecipients = [userId.toString()]; // User's own ID

    // 2. Fetch User's Groups
    const userGroups = await NoticeGroup.find({ schoolId, members: userId, isActive: true }).select('_id').lean();
    userGroups.forEach(g => targetRecipients.push(g._id.toString()));

    // 3. Fetch User's Classes (if student or teacher)
    if (role === USER_ROLES.STUDENT) {
        const profile = await StudentProfile.findOne({ schoolId, userId }).lean();
        if (profile && profile.standard && profile.section) {
            targetRecipients.push(`${profile.standard}-${profile.section}`);
        }
    } else if (role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
        if (profile && Array.isArray(profile.assignedClasses)) {
            profile.assignedClasses.forEach(c => {
                targetRecipients.push(`${c.standard}-${c.section}`);
            });
        }
    }

    const results = await Notice.find({
        schoolId,
        createdBy: { $ne: userId },
        $or: [
            { recipients: { $size: 0 } },  // Sent to all
            { recipients: { $in: targetRecipients } } // Sent to me, my class, or my group
        ],
    })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

    return enrichWithSignedUrls(results);
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

    return enrichWithSignedUrls(notice);
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

    // Clean up the attachment from Cloudinary
    if (notice.attachment) {
        const publicIdToDelete = notice.attachment.public_id || notice.attachment.path;
        await deleteFromCloudinary(publicIdToDelete);
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
const getStudentMobileNotices = async (schoolId, user) => {
    return await getReceivedNotices(schoolId, user);
};

// TEACHER: Returns received + history (sent) notices
const getTeacherMobileNotices = async (schoolId, user) => {
    const received = await getReceivedNotices(schoolId, user);
    const history = await Notice.find({ schoolId, createdBy: user._id })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(20) // Limit mobile history to recent 20
        .lean();

    return { received, history };
};
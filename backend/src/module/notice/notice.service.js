import mongoose from "mongoose";
import { Notice, NoticeGroup } from "./Notice.model.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import cloudinary from "../../config/cloudinary.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import User from "../user/model/User.model.js";

/**
 * Generates a download URL for a Cloudinary attachment.
 *
 * WHY we use direct CDN URLs instead of private_download_url:
 * - `cloudinary.utils.private_download_url()` generates URLs under /v1_1/<cloud>/download
 *   These ONLY work for assets explicitly stored as "private" in Cloudinary.
 * - Our files use `access_mode: 'public'`, so the /download API returns 404.
 * - The correct approach for public assets is the standard CDN URL with the
 *   `fl_attachment` transformation flag, which triggers a browser download prompt.
 *
 * CDN URL format:
 *   raw:   https://res.cloudinary.com/<cloud>/raw/upload/fl_attachment/<public_id>
 *   image: https://res.cloudinary.com/<cloud>/image/upload/fl_attachment/<public_id>.<ext>
 *
 * Falls back to the stored secure_url if public_id and URL are missing.
 */
const getDownloadUrl = (attachment) => {
    if (!attachment) return null;
    try {
        const storedUrl = attachment.secure_url || attachment.path;
        if (!storedUrl) return null;

        // If it's not a Cloudinary URL, return as-is (e.g. legacy local path)
        if (!storedUrl.includes('res.cloudinary.com')) return storedUrl;

        // Detect resource type from the stored URL path segment
        let resourceType = 'raw';
        if (storedUrl.includes('/image/upload/')) resourceType = 'image';
        else if (storedUrl.includes('/video/upload/')) resourceType = 'video';

        // Prefer explicit public_id saved in DB; fall back to extracting from URL
        let publicId = attachment.public_id || attachment.filename;
        if (!publicId) {
            const match = storedUrl.match(new RegExp(`\\/${resourceType}\\/upload\\/(?:v\\d+\\/)?(.+)$`));
            if (match && match[1]) publicId = match[1];
        }

        // If we still couldn't determine the public_id, return the raw URL as fallback
        if (!publicId) return storedUrl;

        // Return the plain Cloudinary CDN URL (no fl_attachment transformation).
        //
        // WHY NOT use fl_attachment here?
        // - fl_attachment:<name> without extension → browser saves as "All Files" (no .pdf)
        // - fl_attachment:name.pdf → Cloudinary URL router misinterprets the dot → HTTP 400
        // - Even if Cloudinary served fl_attachment correctly, the frontend's cross-origin
        //   <a download> attribute is IGNORED by browsers for cross-origin URLs (CORS rule).
        //   The browser navigates to the URL raw instead of downloading — showing PDF binary text.
        //
        // CORRECT approach: return the plain CDN URL. The frontend will use fetch() → Blob
        // → URL.createObjectURL() → programmatic <a> click. This:
        //   ✅ Works cross-origin (fetch handles CORS, the blob URL is same-origin)
        //   ✅ Preserves the original filename with .pdf extension
        //   ✅ No HTTP 400 from Cloudinary URL parsing
        //   ✅ Works in all browsers
        const cdnUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            secure: true,
        });

        return cdnUrl;
    } catch (err) {
        logger.warn(`Failed to generate download URL: ${err.message}`);
        return attachment.secure_url || attachment.path;
    }
};

/**
 * Enriches a notice (or array of notices) by replacing the attachment URL
 * with a fresh CDN download URL (with fl_attachment) so the client can download the file.
 */
const enrichWithSignedUrls = (notices) => {
    if (Array.isArray(notices)) {
        return notices.map(n => {
            if (n.attachment) {
                n.attachment = { ...n.attachment, secure_url: getDownloadUrl(n.attachment) };
            }
            return n;
        });
    }
    // Single notice
    if (notices?.attachment) {
        notices.attachment = { ...notices.attachment, secure_url: getDownloadUrl(notices.attachment) };
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
        requiresAcknowledgment: data.requiresAcknowledgment === true || data.requiresAcknowledgment === 'true',
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

    // Web/Default: History always shows only the requesting user's own notices.
    // Teacher notices sent to admin belong in admin's Received section, not History.
    const query = { schoolId, createdBy: userId };

    // Type filter
    if (filters.type && filters.type !== 'all') {
        query.type = filters.type.toLowerCase(); // 'notice' or 'file'
    }

    // Sent To filter
    if (filters.sentTo && filters.sentTo !== 'all') {
        const sentTo = filters.sentTo.toLowerCase();
        if (sentTo === 'group') {
            query.recipientType = { $in: ['classes', 'groups', 'all'] };
        } else if (sentTo === 'individual') {
            query.recipientType = { $in: ['users', 'students'] };
        } else {
            // Support explicit matching if sentTo matches an exact type directly
            query.recipientType = sentTo;
        }
    }

    // Date filter
    if (filters.date && filters.date !== 'all') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateMap = {
            today: todayStart,
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

    if (role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN) {
        const teacherUsers = await User.find({ schoolId, role: USER_ROLES.TEACHER })
            .select('_id')
            .lean();
        const teacherIds = teacherUsers.map(t => t._id);

        if (teacherIds.length === 0) {
            return [];
        }

        const results = await Notice.find({
            schoolId,
            createdBy: { $in: teacherIds }
        })
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return enrichWithSignedUrls(results);
    }

    // 1. Gather all target strings/IDs the user is a part of
    const targetRecipients = [userId.toString()]; // User's own ID

    // 2. Fetch User's Groups
    const userGroups = await NoticeGroup.find({ schoolId, members: userId, isActive: true }).select('_id').lean();
    userGroups.forEach(g => targetRecipients.push(g._id.toString()));

    let myTeacherIds = [];

    // 3. Fetch User's Classes (if student or teacher)
    if (role === USER_ROLES.STUDENT) {
        const profile = await StudentProfile.findOne({ schoolId, userId }).lean();
        if (profile && profile.standard && profile.section) {
            targetRecipients.push(`${profile.standard}-${profile.section}`);
            
            // Allow student to receive 'All Students' notices sent implicitly by their own assigned teachers
            const teachers = await TeacherProfile.find({
                schoolId,
                assignedClasses: {
                    $elemMatch: { standard: profile.standard, section: profile.section }
                }
            }).select('userId').lean();
            myTeacherIds = teachers.map(t => t.userId);
        }
    } else if (role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({ schoolId, userId }).lean();
        if (profile && Array.isArray(profile.assignedClasses)) {
            profile.assignedClasses.forEach(c => {
                targetRecipients.push(`${c.standard}-${c.section}`);
            });
        }
    }

    const orConditions = [
        { recipientType: 'all' }, // Sent to entire school
        { recipients: { $in: targetRecipients } } // explicitly sent to me, my class, or my group
    ];

    // If teacher sent to "All Students", it's implicit (recipients is empty array).
    // Only fetch these if the sender is actually one of my assigned teachers.
    if (role === USER_ROLES.STUDENT && myTeacherIds.length > 0) {
        orConditions.push({
            recipientType: 'students',
            recipients: { $size: 0 },
            createdBy: { $in: myTeacherIds }
        });
    }

    const results = await Notice.find({
        schoolId,
        createdBy: { $ne: userId },
        $or: orConditions
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


// ACKNOWLEDGMENT SERVICES

// Record a user's acknowledgment of a notice
export const acknowledgeNotice = async (schoolId, noticeId, user, responseMessage, files = []) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new BadRequestError("Invalid notice ID");
    }

    const notice = await Notice.findOne({ _id: noticeId, schoolId });
    if (!notice) {
        throw new NotFoundError("Notice not found");
    }

    if (!notice.requiresAcknowledgment) {
        throw new BadRequestError("This notice does not require acknowledgment");
    }

    // Prevent duplicate acknowledgments
    const alreadyAcknowledged = notice.acknowledgments.some(
        (a) => a.userId.toString() === user._id.toString()
    );
    if (alreadyAcknowledged) {
        throw new ConflictError("You have already acknowledged this notice");
    }

    const cleanupUploadedFiles = async () => {
        for (const file of files || []) {
            const fileUrl = file.path || file.secure_url || file.url;
            if (fileUrl) {
                try {
                    await deleteFromCloudinary(fileUrl);
                } catch (cleanupError) {
                    logger.warn(`Failed to cleanup uploaded file: ${cleanupError.message}`);
                }
            } else if (file.public_id || file.filename) {
                try {
                    await cloudinary.uploader.destroy(file.public_id || file.filename, { resource_type: 'raw' });
                } catch (cleanupError) {
                    logger.warn(`Failed to cleanup uploaded file: ${cleanupError.message}`);
                }
            }
        }
    };

    const attachments = (files || []).map((file) => {
        const fileUrl = file.path || file.secure_url || file.url;
        const filePublicId = file.filename || file.public_id;
        return {
            filename: filePublicId,
            originalName: file.originalname,
            path: fileUrl,
            secure_url: fileUrl,
            public_id: filePublicId,
            size: file.size,
            mimetype: file.mimetype,
        };
    });

    const trimmedMessage = (responseMessage || '').trim();
    const hasMessage = trimmedMessage.length > 0;
    const hasAttachments = attachments.length > 0;

    if (hasMessage && trimmedMessage.length < 2 && !hasAttachments) {
        await cleanupUploadedFiles();
        throw new BadRequestError("Response message must be at least 2 characters long");
    }

    if (!hasMessage && !hasAttachments) {
        await cleanupUploadedFiles();
        throw new BadRequestError("Please provide a response message (min 2 chars) or at least one attachment");
    }

    try {
        notice.acknowledgments.push({
            userId: user._id,
            role: user.role,
            timestamp: new Date(),
            responseMessage: trimmedMessage,
            attachments,
        });
        await notice.save();
    } catch (saveError) {
        await cleanupUploadedFiles();
        throw saveError;
    }

    logger.info(`Notice ${noticeId} acknowledged by ${user._id} (${user.role})`);
    return { message: "Notice acknowledged successfully" };
};

// Get acknowledgment status for a notice — only for the original sender
export const getAcknowledgments = async (schoolId, noticeId, requestingUserId) => {
    if (!mongoose.Types.ObjectId.isValid(noticeId)) {
        throw new BadRequestError("Invalid notice ID");
    }

    const notice = await Notice.findOne({ _id: noticeId, schoolId })
        .populate("acknowledgments.userId", "name email role")
        .lean();

    if (!notice) {
        throw new NotFoundError("Notice not found");
    }

    if (notice.createdBy.toString() !== requestingUserId.toString()) {
        throw new ForbiddenError("Only the sender can view acknowledgment status");
    }

    // Bug 2 fix: if the notice doesn't require acknowledgment, return a clear "not required" response
    // so the frontend can skip rendering the panel entirely.
    if (!notice.requiresAcknowledgment) {
        return {
            requiresAcknowledgment: false,
            recipientType: notice.recipientType,
            acknowledgedCount: 0,
            pendingCount: 0,
            acknowledged: [],
            pending: [],
            note: "This notice does not require acknowledgment.",
        };
    }

    const acknowledged = notice.acknowledgments.map((a) => ({
        userId: a.userId?._id || a.userId,
        name: a.userId?.name || "Unknown",
        email: a.userId?.email || "",
        role: a.role,
        timestamp: a.timestamp,
        responseMessage: a.responseMessage || '',
        attachments: (a.attachments || []).map(att => ({
            ...att,
            secure_url: getDownloadUrl(att),
        })),
    }));

    const User = mongoose.model("User");

    // --- Resolve intended recipients to build a "pending" list ---
    let intendedUserIds = [];

    if (notice.recipientType === "all") {
        // Bug 3 fix: If the sender is a teacher, resolve their assigned class students
        // instead of returning an "indeterminate" response.
        const senderUser = await User.findById(notice.createdBy).select("role").lean();

        if (senderUser?.role === USER_ROLES.TEACHER) {
            const teacherProfile = await TeacherProfile.findOne({ userId: notice.createdBy })
                .select("assignedClasses")
                .lean();
            if (teacherProfile?.assignedClasses?.length) {
                const profiles = await StudentProfile.find({
                    schoolId,
                    $or: teacherProfile.assignedClasses.map(c => ({ standard: c.standard, section: c.section }))
                }).select("userId").lean();
                intendedUserIds = profiles.map(p => p.userId.toString());
            }
            // Fall through — intendedUserIds is now populated, continue to build pending list below
        } else {
            // Admin sent to entire school — list is too large to enumerate
            return {
                requiresAcknowledgment: notice.requiresAcknowledgment,
                recipientType: notice.recipientType,
                acknowledgedCount: acknowledged.length,
                pendingCount: null,   // indeterminate for school-wide admin notices
                acknowledged,
                pending: [],
                note: "Pending list is not available for notices sent to the entire school.",
            };
        }
    } else if (notice.recipientType === "users" || notice.recipientType === "students") {
        // recipients[] holds user ObjectId strings for specific-student sends.
        // SPECIAL CASE: when a teacher sends to "All Students", RECIPIENT_MAP sets
        // recipientType="students" with key=null → recipients=[] (empty array).
        // In that case, resolve the full class roster from the teacher's profile.
        if (notice.recipients.length === 0 && notice.recipientType === "students") {
            const teacherProfile = await TeacherProfile.findOne({ userId: notice.createdBy })
                .select("assignedClasses")
                .lean();
            if (teacherProfile?.assignedClasses?.length) {
                const profiles = await StudentProfile.find({
                    schoolId,
                    $or: teacherProfile.assignedClasses.map(c => ({ standard: c.standard, section: c.section }))
                }).select("userId").lean();
                intendedUserIds = profiles.map(p => p.userId.toString());
            }
        } else {
            intendedUserIds = notice.recipients.filter((r) => mongoose.Types.ObjectId.isValid(r));
        }
    } else if (notice.recipientType === "classes") {
        // recipients[] holds "standard-section" strings (e.g. ["10-A", "11-B"])
        const classIds = notice.recipients;
        const profiles = await StudentProfile.find({ schoolId, $or: classIds.map((c) => {
            const [standard, section] = c.split('-');
            return { standard, section };
        }) }).select("userId").lean();
        intendedUserIds = profiles.map((p) => p.userId.toString());
    } else if (notice.recipientType === "groups") {
        // recipients[] holds NoticeGroup ObjectId strings
        const groupIds = notice.recipients.filter((r) => mongoose.Types.ObjectId.isValid(r));
        const groups = await NoticeGroup.find({ _id: { $in: groupIds }, schoolId }).select("members").lean();
        groups.forEach((g) => g.members.forEach((m) => intendedUserIds.push(m.toString())));
    }

    const acknowledgedUserIdSet = new Set(acknowledged.map((a) => a.userId.toString()));
    const pendingUserIds = [...new Set(intendedUserIds)].filter((id) => !acknowledgedUserIdSet.has(id.toString()));

    // Hydrate pending users
    const pendingUsers = await User.find({ _id: { $in: pendingUserIds } }).select("name email role").lean();

    return {
        requiresAcknowledgment: notice.requiresAcknowledgment,
        recipientType: notice.recipientType,
        acknowledgedCount: acknowledged.length,
        pendingCount: pendingUsers.length,
        acknowledged,
        pending: pendingUsers.map((u) => ({ userId: u._id, name: u.name, email: u.email, role: u.role })),
    };
};


// GROUP SERVICES

// Bug 4 fix: Get ALL students assigned to the requesting teacher (no pagination)
// This avoids the pageSize=100 cap that was causing teachers with >100 students to see truncated lists.
export const getTeacherStudents = async (schoolId, teacherId) => {
    const teacherProfile = await TeacherProfile.findOne({ schoolId, userId: teacherId })
        .select("assignedClasses")
        .lean();

    if (!teacherProfile?.assignedClasses?.length) {
        return [];
    }

    // Find all student profiles matching the teacher's assigned classes
    const studentProfiles = await StudentProfile.find({
        schoolId,
        $or: teacherProfile.assignedClasses.map(c => ({ standard: c.standard, section: c.section }))
    }).select("userId").lean();

    const studentUserIds = studentProfiles.map(p => p.userId);

    const User = mongoose.model("User");
    const students = await User.find({
        _id: { $in: studentUserIds },
        schoolId,
        role: USER_ROLES.STUDENT,
        isArchived: false,
    }).select("name email role avatarUrl").lean();

    return students;
};

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

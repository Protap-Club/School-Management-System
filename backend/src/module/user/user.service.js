import User from "./model/User.model.js";
import StudentProfile from "./model/StudentProfile.model.js";
import TeacherProfile from "./model/TeacherProfile.model.js";
import { PROFILE_CONFIG } from "../../config/profiles.js";
import { sendCredentialsEmail } from "../../utils/email.util.js";
import { USER_ROLES, canManageRole } from "../../constants/userRoles.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import logger from "../../config/logger.js";

// Defines which user roles each role is allowed to view/manage.
const VIEWABLE_ROLES = Object.freeze({
    [USER_ROLES.TEACHER]: [USER_ROLES.STUDENT],
    [USER_ROLES.ADMIN]: [USER_ROLES.TEACHER, USER_ROLES.STUDENT],
    [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
});

// Helper to build a scoped query based on who is asking.
// Enforces school isolation and role visibility rules.
const buildAccessQuery = (creator, filters = {}) => {
    const { name, isArchived, role, userIds, ...otherFilters } = filters;
    const query = {
        schoolId: creator.schoolId,
        ...otherFilters
    };

    // Handle userIds -> _id conversion
    if (userIds) {
        query._id = { $in: Array.isArray(userIds) ? userIds : [userIds] };
    }

    query.isArchived = isArchived !== undefined ? isArchived : false;

    if (name) query.name = { $regex: name, $options: "i" };

    // Role-based scoping: determine which roles the caller is allowed to see
    const allowedRoles = VIEWABLE_ROLES[creator.role] || [USER_ROLES.STUDENT];

    if (role && role !== 'all') {
        // Validate: caller can only filter to roles they're allowed to see
        if (!allowedRoles.includes(role)) {
            throw new ForbiddenError(`You are not authorized to view users with role '${role}'`);
        }
        query.role = role;
    } else {
        // No explicit role filter — show all roles the caller can see
        query.role = allowedRoles.length === 1 ? allowedRoles[0] : { $in: allowedRoles };
    }

    return query;
};

// CREATE USER 
export const createUser = async (creator, userData) => {
    const { name, email, role, skipEmail } = userData;

    if (!name) throw new BadRequestError("Name is required");

    // Hierarchy check: creator can only create roles below their own
    if (!canManageRole(creator.role, role)) {
        throw new ForbiddenError(`You cannot create a user with role '${role}'. You can only create roles below your own.`);
    }

    // Teachers can only create students
    if (creator.role === USER_ROLES.TEACHER && role !== USER_ROLES.STUDENT) {
        throw new ForbiddenError("Teachers can only create student accounts");
    }

    // School context — always scoped to creator's school
    const targetSchoolId = userData.schoolId || creator.schoolId;

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError("Email already registered");

    // Generate credentials
    const plainPassword = userData.password || Math.random().toString(36).slice(-8);
    const config = PROFILE_CONFIG[role];

    // Step 1: Create User
    const newUser = await User.create({
        ...userData,
        password: plainPassword, // User model .pre('save') hashes this
        schoolId: targetSchoolId,
        createdBy: creator._id
    });

    // Step 2: Create Role-Specific Profile
    if (config) {
        await config.model.create({
            userId: newUser._id,
            schoolId: targetSchoolId,
            ...config.extractFields(userData)
        });
    }

    // Step 3: Send welcome email (fire-and-forget, non-blocking)
    if (!skipEmail) {
        sendCredentialsEmail({
            to: email,
            name,
            role,
            password: plainPassword
        }).catch(err => logger.error({ err, email }, "Failed to send credentials email"));
    }

    return {
        user: {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            schoolId: newUser.schoolId,
            createdBy: newUser.createdBy
        }
    };
};

// GET USERS (with pagination, role scoping, and teacher class filtering)
export const getUsers = async (creator, filters = {}) => {
    const { page = 0, pageSize = 25, ...queryFilters } = filters;
    const query = buildAccessQuery(creator, queryFilters);

    // Teachers can only see students from their assigned classes
    if (creator.role === USER_ROLES.TEACHER && query.role === USER_ROLES.STUDENT) {
        const teacherProfile = await TeacherProfile.findOne({ userId: creator._id })
            .select("assignedClasses")
            .lean();

        if (teacherProfile?.assignedClasses?.length) {
            const matchingStudents = await StudentProfile.find({
                schoolId: creator.schoolId,
                $or: teacherProfile.assignedClasses.map(cls => ({
                    standard: cls.standard,
                    section: cls.section
                }))
            }).select("userId").lean();

            const allowedStudentIds = matchingStudents.map(sp => sp.userId);
            query._id = query._id
                ? { $in: allowedStudentIds.filter(id => query._id.$in?.includes(id.toString())) }
                : { $in: allowedStudentIds };
        }
    }

    const totalCount = await User.countDocuments(query);

    // Determine which role is being queried for conditional population
    const queryRole = typeof query.role === 'string' ? query.role : null;

    let userQuery = User.find(query)
        .select("-password")
        .populate("schoolId", "name code")
        .sort({ createdAt: -1 })
        .skip(Number(page) * Number(pageSize))
        .limit(Number(pageSize));

    // Conditional profile population — only populate the relevant profile
    if (queryRole === USER_ROLES.STUDENT) {
        userQuery = userQuery.populate("studentProfile");
    } else if (queryRole === USER_ROLES.TEACHER) {
        userQuery = userQuery.populate("teacherProfile");
    } else if (queryRole === USER_ROLES.ADMIN) {
        userQuery = userQuery.populate("adminProfile");
    } else {
        // Mixed roles — populate all profiles
        userQuery = userQuery
            .populate("studentProfile")
            .populate("teacherProfile")
            .populate("adminProfile");
    }

    const users = await userQuery.lean();

    return {
        totalCount,
        users: users.map(u => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            contactNo: u.contactNo,
            avatarUrl: u.avatarUrl,
            schoolId: u.schoolId,
            isActive: u.isActive,
            isArchived: u.isArchived,
            profile: u.studentProfile || u.teacherProfile || u.adminProfile || null
        })),
        pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(totalCount / Number(pageSize))
        }
    };
};

// GET USER BY ID (single user detail view)
export const getUserById = async (creator, userId) => {
    const user = await User.findOne({
        _id: userId,
        schoolId: creator.schoolId // Enforce school isolation
    })
        .select("-password")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) throw new NotFoundError("User not found");

    // Verify the caller is allowed to view this user's role
    const allowedRoles = VIEWABLE_ROLES[creator.role] || [USER_ROLES.STUDENT];
    if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError("You are not authorized to view this user");
    }

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNo: user.contactNo,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        isActive: user.isActive,
        isArchived: user.isArchived,
        createdAt: user.createdAt,
        profile: user.studentProfile || user.teacherProfile || user.adminProfile || null
    };
};

// GET MY PROFILE (own profile — accessible from both web & mobile)
export const getMyProfile = async (userId) => {
    const user = await User.findById(userId)
        .select("-password")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) throw new NotFoundError("User not found");

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        isActive: user.isActive,
        profile: user.studentProfile || user.teacherProfile || user.adminProfile || null
    };
};

// TOGGLE ARCHIVE STATUS (soft delete / restore)
export const toggleArchive = async (creator, userIds, isArchived) => {
    const query = buildAccessQuery(creator, {
        userIds,
        isArchived: !isArchived // Find users in the OPPOSITE state
    });

    const updateData = { isArchived };
    if (isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = creator._id;
    } else {
        updateData.archivedAt = null;
        updateData.archivedBy = null;
    }

    const result = await User.updateMany(query, { $set: updateData });

    if (result.matchedCount === 0) {
        throw new NotFoundError(`No ${!isArchived ? 'archived' : 'active'} users found to update`);
    }

    return { modifiedCount: result.modifiedCount };
};

// PERMANENT DELETE (without transactions for standalone MongoDB)
export const hardDeleteUsers = async (creator, userIds) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const query = buildAccessQuery(creator, { userIds: ids, isArchived: true });

    const usersToDelete = await User.find(query);
    if (usersToDelete.length === 0) {
        throw new BadRequestError("Users must be archived before permanent deletion");
    }

    const deleteIds = usersToDelete.map(u => u._id);

    // Delete Profiles first, then Users
    for (const user of usersToDelete) {
        const config = PROFILE_CONFIG[user.role];
        if (config) await config.model.deleteMany({ userId: user._id });
    }

    const result = await User.deleteMany({ _id: { $in: deleteIds } });

    return { deletedCount: result.deletedCount };
};

// UPDATE AVATAR
export const updateAvatar = async (userId, avatarUrl, avatarPublicId) => {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const oldAvatarPublicId = user.avatarPublicId || user.avatarUrl; // Fallback for legacy URLs
    user.avatarUrl = avatarUrl;
    user.avatarPublicId = avatarPublicId;
    await user.save();

    // Clean up old avatar from Cloudinary
    if (oldAvatarPublicId) await deleteFromCloudinary(oldAvatarPublicId);

    logger.info(`Avatar updated for user: ${userId}`);
    return { avatarUrl: user.avatarUrl };
};

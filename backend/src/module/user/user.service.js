import User from "./model/User.model.js";
import StudentProfile from "./model/StudentProfile.model.js";
import TeacherProfile from "./model/TeacherProfile.model.js";
import School from "../school/School.model.js";
import RefreshToken from "../auth/RefreshToken.model.js";
import { PROFILE_CONFIG } from "../../config/profiles.js";
import { sendCredentialsEmail } from "../../utils/email.util.js";
import { USER_ROLES, canManageRole, VIEWABLE_ROLES } from "../../constants/userRoles.js";
import { buildAccessQuery } from "../../utils/access.util.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import { deleteFromCloudinary } from "../../middlewares/upload.middleware.js";
import logger from "../../config/logger.js";
import { generatePassword } from "../../utils/password.util.js";


// CREATE USER

export const createUser = async (creator, userData) => {
    const { name, email, role, skipEmail } = userData;

    // Hierarchy check: creator can only create roles below their own
    if (!canManageRole(creator.role, role)) {
        throw new ForbiddenError(`You cannot create a user with role '${role}'. You can only create roles below your own.`);
    }

    // School context — always scoped to creator's school
    const targetSchoolId = userData.schoolId || creator.schoolId;

    // Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError("Email already registered");

    // Generate secure password
    const plainPassword = userData.password || generatePassword(12);
    const config = PROFILE_CONFIG[role];
    const school = await School.findById(targetSchoolId).select("name").lean();

    // Step 1: Create User
    const newUser = await User.create({
        ...userData,
        password: plainPassword, // User model .pre('save') hashes this
        schoolId: targetSchoolId,
        createdBy: creator._id
    });

    // Step 2: Create Role-Specific Profile (manual rollback on failure)
    if (config) {
        try {
            await config.model.create({
                userId: newUser._id,
                schoolId: targetSchoolId,
                ...config.extractFields(userData)
            });
        } catch (profileError) {
            // Roll back: remove the user if profile creation fails
            await User.deleteOne({ _id: newUser._id });
            throw profileError;
        }
    }

    // Step 3: Send welcome email (fire-and-forget, non-blocking)
    if (!skipEmail) {
        sendCredentialsEmail({
            to: email,
            name,
            role,
            password: plainPassword,
            schoolName: school?.name
        }).catch(err => logger.error({ err, email }, "Failed to send credentials email"));
    }

    const { _id, name: n, email: e, role: r, schoolId: s, createdBy: cb } = newUser;
    return { user: { _id, name: n, email: e, role: r, schoolId: s, createdBy: cb } };
};

// GET USERS (with pagination, role scoping, and teacher class filtering)
export const getUsers = async (creator, filters = {}) => {

    // 1. INPUT VALIDATION & SANITIZATION
    const page = Math.max(0, filters.page || 0);
    const maxPageSize = [USER_ROLES.TEACHER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(creator.role) ? 5000 : 100;
    const pageSize = Math.min(maxPageSize, Math.max(1, filters.pageSize || 25));
    const { page: _, pageSize: __, ...queryFilters } = filters;

    // 2. BUILD BASE QUERY WITH ACCESS CONTROL
    const query = buildAccessQuery(creator, queryFilters);

    // 3. TEACHER-SPECIFIC CLASS FILTERING
    if (creator.role === USER_ROLES.TEACHER) {
        const assignedClasses = await getTeacherAssignedClasses(creator._id);

        if (!assignedClasses.length) {
            return { totalCount: 0, users: [], pagination: { page, pageSize, totalPages: 0 } };
        }

        // Only filter if querying students (teachers can view their own profile)
        if (!query.role || query.role === USER_ROLES.STUDENT ||
            (query.role.$in && query.role.$in.includes(USER_ROLES.STUDENT))) {

            const matchingStudents = await StudentProfile.find({
                schoolId: creator.schoolId,
                $or: assignedClasses.map(cls => ({
                    standard: cls.standard,
                    section: cls.section
                }))
            }).select("userId").lean();

            const allowedStudentIds = matchingStudents.map(sp => sp.userId.toString());

            // Merge with existing _id filter if present
            if (query._id) {
                const existingIds = Array.isArray(query._id.$in)
                    ? query._id.$in.map(id => id.toString())
                    : [query._id.toString()];

                const intersection = existingIds.filter(id => allowedStudentIds.includes(id));
                query._id = { $in: intersection };
            } else {
                query._id = { $in: allowedStudentIds };
            }
        }
    }

    // 4. COUNT TOTAL MATCHING DOCUMENTS
    const totalCount = await User.countDocuments(query);

    // Early return if no results
    if (totalCount === 0) {
        return {
            totalCount: 0,
            users: [],
            pagination: { page, pageSize, totalPages: 0 }
        };
    }

    // 5. FETCH USERS WITH CONDITIONAL POPULATION
    const queryRole = typeof query.role === 'string' ? query.role : null;

    let userQuery = User.find(query)
        .select("-password -__v")
        .populate("schoolId", "name code")
        .sort({ createdAt: -1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .lean();

    // Conditional profile population for performance
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

    const users = await userQuery;

    // 6. RETURN FORMATTED RESPONSE
    return {
        totalCount,
        users: users.map(formatUserResponse),
        pagination: {
            page,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize)
        }
    };
};

// GET USER BY ID (single user detail view)
export const getUserById = async (creator, userId) => {
    // 1. FETCH USER WITH SCHOOL ISOLATION
    const user = await User.findOne({
        _id: userId,
        schoolId: creator.schoolId // Enforce school isolation
    })
        .select("-password -__v")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) {
        throw new NotFoundError("User not found or you do not have access to this user");
    }

    // 3. ROLE HIERARCHY ENFORCEMENT
    // Verify the caller is allowed to view this user's role (hierarchy check)
    const allowedRoles = VIEWABLE_ROLES[creator.role] || [];

    if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(`You are not authorized to view users with role '${user.role}'`);
    }

    // 4. TEACHER-SPECIFIC CLASS VALIDATION
    if (creator.role === USER_ROLES.TEACHER && user.role === USER_ROLES.STUDENT) {
        const assignedClasses = await getTeacherAssignedClasses(creator._id);

        if (!assignedClasses.length) {
            throw new ForbiddenError("You have no assigned classes and cannot view this student");
        }

        // Get student's class information
        const studentProfile = user.studentProfile;
        if (!studentProfile) {
            throw new NotFoundError("Student profile not found");
        }

        // Check if student belongs to any of teacher's assigned classes
        const isAssigned = assignedClasses.some(cls =>
            cls.standard === studentProfile.standard &&
            cls.section === studentProfile.section
        );

        if (!isAssigned) {
            throw new ForbiddenError("This student is not in your assigned classes");
        }
    }

    // 5. RETURN SANITIZED USER DATA
    return formatUserResponse(user);
};

// GET MY PROFILE (own profile — accessible from both web & mobile)
export const getMyProfile = async (userId) => {
    // 1. FETCH USER WITH PROFILES
    const user = await User.findById(userId)
        .select("-password -__v")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .populate("adminProfile")
        .lean();

    if (!user) {
        throw new NotFoundError("User not found");
    }

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNo: user.contactNo,
        schoolId: user.schoolId,
        isActive: user.isActive,
        profile: user.studentProfile || user.teacherProfile || user.adminProfile || null
    };
};

// TOGGLE ARCHIVE STATUS (soft delete / restore)
export const toggleArchive = async (creator, userIds, isArchived) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];

    // 2. BUILD QUERY WITH ACCESS CONTROL
    const query = buildAccessQuery(creator, {
        userIds: ids,
        isArchived: !isArchived // Find users in the OPPOSITE state
    });

    // 3. FETCH AND VALIDATE TARGET USERS
    const targetUsers = await User.find(query).select("_id role").lean();

    if (targetUsers.length === 0) {
        throw new NotFoundError(
            `No ${!isArchived ? 'archived' : 'active'} users found to ${isArchived ? 'archive' : 'restore'}`
        );
    }

    // 4. ROLE HIERARCHY VERIFICATION
    // Ensure creator can MANAGE all target roles
    const forbiddenUsers = targetUsers.filter(u => !canManageRole(creator.role, u.role));

    if (forbiddenUsers.length > 0) {
        const forbiddenRoles = [...new Set(forbiddenUsers.map(u => u.role))];
        throw new ForbiddenError(
            `You cannot ${isArchived ? 'archive' : 'restore'} users with roles: ${forbiddenRoles.join(', ')}`
        );
    }

    // 5. PREVENT SELF-ARCHIVING
    const isSelfArchiving = targetUsers.some(u => u._id.toString() === creator._id.toString());
    if (isSelfArchiving && isArchived) {
        throw new ForbiddenError("You cannot archive your own account");
    }

    // 6. PERFORM UPDATE
    const updateData = { isArchived };

    if (isArchived) {
        updateData.archivedAt = new Date();
        updateData.archivedBy = creator._id;
        updateData.isActive = false;
    } else {
        updateData.archivedAt = null;
        updateData.archivedBy = null;
        updateData.isActive = true;
    }

    const verifiedIds = targetUsers.map(u => u._id);
    const result = await User.updateMany(
        { _id: { $in: verifiedIds } },
        { $set: updateData }
    );

    // Revoke all refresh tokens for archived users (immediate session invalidation)
    if (isArchived) {
        await RefreshToken.updateMany(
            { userId: { $in: verifiedIds }, isRevoked: false },
            { $set: { isRevoked: true, expiresAt: new Date() } }
        );
    }

    // 7. LOG AND RETURN
    logger.info({
        action: isArchived ? 'archive' : 'restore',
        modifiedCount: result.modifiedCount,
        performedBy: creator._id,
        targetIds: verifiedIds
    }, `Users ${isArchived ? 'archived' : 'restored'}`);

    return {
        modifiedCount: result.modifiedCount,
        requestedCount: ids.length,
        notFoundCount: ids.length - targetUsers.length
    };
};

// PERMANENT DELETE (with proper cleanup)
export const hardDeleteUsers = async (creator, userIds) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];

    // 2. BUILD QUERY - MUST BE ARCHIVED
    const query = buildAccessQuery(creator, {
        userIds: ids,
        isArchived: true
    });

    const usersToDelete = await User.find(query).select("_id role avatarPublicId").lean();

    if (usersToDelete.length === 0) {
        throw new BadRequestError(
            "No archived users found. Users must be archived before permanent deletion."
        );
    }

    // 3. ROLE HIERARCHY VERIFICATION
    const forbiddenUsers = usersToDelete.filter(u => !canManageRole(creator.role, u.role));

    if (forbiddenUsers.length > 0) {
        const forbiddenRoles = [...new Set(forbiddenUsers.map(u => u.role))];
        throw new ForbiddenError(
            `You cannot delete users with roles: ${forbiddenRoles.join(', ')}`
        );
    }

    // 4. PREVENT SELF-DELETION
    const isSelfDeleting = usersToDelete.some(u => u._id.toString() === creator._id.toString());
    if (isSelfDeleting) {
        throw new ForbiddenError("You cannot permanently delete your own account");
    }

    const deleteIds = usersToDelete.map(u => u._id);

    // 5. DELETE PROFILES
    for (const user of usersToDelete) {
        const config = PROFILE_CONFIG[user.role];
        if (config) {
            try {
                await config.model.deleteMany({ userId: user._id });
            } catch (error) {
                logger.error({
                    error,
                    userId: user._id,
                    role: user.role
                }, "Failed to delete user profile");
                // Continue with deletion - log but don't fail
            }
        }
    }

    // 6. DELETE USERS
    const result = await User.deleteMany({ _id: { $in: deleteIds } });

    // 7. CLEANUP AVATARS FROM CLOUDINARY
    for (const user of usersToDelete) {
        if (user.avatarPublicId) {
            deleteFromCloudinary(user.avatarPublicId)
                .catch(err => logger.warn({
                    err,
                    publicId: user.avatarPublicId,
                    userId: user._id
                }, "Failed to delete avatar from Cloudinary"));
        }
    }

    // 8. LOG AND RETURN
    logger.info({
        deletedCount: result.deletedCount,
        performedBy: creator._id,
        deletedIds: deleteIds
    }, "Users permanently deleted");

    return {
        deletedCount: result.deletedCount,
        requestedCount: ids.length,
        notFoundCount: ids.length - usersToDelete.length
    };
};

// UPDATE TEACHER PROFILE (e.g. expectedSalary)
export const updateTeacherProfile = async (creator, userId, data) => {
    // Only admins can update profiles in this way
    if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(creator.role)) {
        throw new ForbiddenError("Only admins can update teacher profiles");
    }

    const user = await User.findOne({ _id: userId, schoolId: creator.schoolId });
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== USER_ROLES.TEACHER) throw new BadRequestError("User is not a teacher");

    const updatedProfile = await TeacherProfile.findOneAndUpdate(
        { userId, schoolId: creator.schoolId },
        { $set: data },
        { new: true, runValidators: true, upsert: true }
    );

    if (!updatedProfile) throw new NotFoundError("Teacher profile not found");

    logger.info(`Teacher profile updated for user ${userId} by ${creator._id}`);
    return updatedProfile;
};

// UPDATE AVATAR
export const updateAvatar = async (userId, avatarUrl, avatarPublicId) => {
    // 1. FETCH USER
    const user = await User.findById(userId).select("avatarUrl avatarPublicId");

    if (!user) {
        throw new NotFoundError("User not found");
    }

    // 3. STORE OLD AVATAR INFO
    const oldAvatarPublicId = user.avatarPublicId;

    // 4. UPDATE USER
    user.avatarUrl = avatarUrl;
    user.avatarPublicId = avatarPublicId;
    await user.save();

    // 5. CLEANUP OLD AVATAR (NON-BLOCKING)
    if (oldAvatarPublicId && oldAvatarPublicId !== avatarPublicId) {
        deleteFromCloudinary(oldAvatarPublicId)
            .catch(err => logger.warn({
                err,
                publicId: oldAvatarPublicId,
                userId
            }, "Failed to delete old avatar from Cloudinary"));
    }

    // 6. LOG AND RETURN
    logger.info({
        userId,
        newAvatarPublicId: avatarPublicId
    }, "Avatar updated successfully");

    return {
        avatarUrl: user.avatarUrl,
        avatarPublicId: user.avatarPublicId
    };
};

//  Internal Helpers 

const formatUserResponse = (user) => {
    if (!user) return null;

    const profile = user.studentProfile || user.teacherProfile || user.adminProfile || null;

    // Sanitize profile: remove internal fields like 'permissions'
    let sanitizedProfile = null;
    if (profile) {
        const { permissions, ...rest } = profile;
        sanitizedProfile = rest;
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
        updatedAt: user.updatedAt,
        profile: sanitizedProfile
    };
};

const getTeacherAssignedClasses = async (teacherId) => {
    const profile = await TeacherProfile.findOne({ userId: teacherId }).select("assignedClasses").lean();
    return profile?.assignedClasses || [];
};

import User from "./model/User.model.js";
import { PROFILE_CONFIG } from "../../config/profiles.js";
import { sendCredentialsEmail } from "../../utils/email.util.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";

// Helper to build a query based on who is asking (The Filter Factory)
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
    if (role && role !== 'all') query.role = role;
    // Only default to students for teachers if no explicit role was requested
    else if (creator.role === 'teacher') query.role = 'student';

    return query;
};

// CREATE USER 
export const createUser = async (creator, userData) => {
    const { name, email, role, skipEmail } = userData;

    // Ensure name is present
    if (!name) throw new BadRequestError("Name is required");

    // Determine correct school context - use provided schoolId or fallback to creator's schoolId
    const targetSchoolId = userData.schoolId || creator.schoolId;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError("Email already registered");

    // Generate credentials
    const plainPassword = userData.password || Math.random().toString(36).slice(-8);
    const config = PROFILE_CONFIG[role];

    // Step 1: Create User
    const newUser = await User.create({
        ...userData,
        password: plainPassword, // User model has a .pre('save') hook to hash this
        schoolId: targetSchoolId,
        createdBy: creator._id
    });

    // Step 2: Create Profile 
    if (config) {
        await config.model.create({
            userId: newUser._id,
            schoolId: targetSchoolId,
            ...config.extractFields(userData)
        });
    }

    // Send email AFTER successful DB operations (Only if not skipped)
    if (!skipEmail) {
        sendCredentialsEmail({
            to: email,
            name,
            role,
            password: plainPassword
        }).catch(err => console.error("Email failed", err));
    }

    const data = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.schoolId,
        createdBy: newUser.createdBy
    }

    return { user: data };
};

// GET USERS 
export const getUsers = async (creator, filters = {}) => {
    // Extract pagination from filters before building query
    const { page = 0, pageSize = 25, ...queryFilters } = filters;
    const query = buildAccessQuery(creator, queryFilters);

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);

    const users = await User.find(query)
        .select("-password")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
        .sort({ createdAt: -1 })
        .skip(Number(page) * Number(pageSize))
        .limit(Number(pageSize))
        .lean();

    return {
        users: users.map(u => ({
            _id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            schoolId: u.schoolId,
            isActive: u.isActive,
            profile: u.studentProfile || u.teacherProfile
        })),
        pagination: {
            totalCount,
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(totalCount / Number(pageSize))
        }
    };
};

// TOGGLE ARCHIVE STATUS 
export const toggleUserStatus = async (creator, userIds, isArchived) => {
    const query = buildAccessQuery(creator, {
        userIds,
        isArchived: !isArchived
    });

    const result = await User.updateMany(query, { $set: { isArchived } });

    if (result.matchedCount === 0) {
        throw new NotFoundError(`No ${!isArchived ? 'archived' : 'active'} users found to update`);
    }

    return { updateResult: result };
};

// PERMANENT DELETE (without transactions for standalone MongoDB)
// export const hardDeleteUsers = async (creator, userIds) => {
//     const ids = Array.isArray(userIds) ? userIds : [userIds];
//     const query = buildAccessQuery(creator, { userIds: ids, isArchived: true });

//     const usersToDelete = await User.find(query);
//     if (usersToDelete.length === 0) {
//         throw new BadRequestError("Users must be archived before permanent deletion");
//     }

//     const deleteIds = usersToDelete.map(u => u._id);

//     // Delete Profiles first, then Users
//     for (const user of usersToDelete) {
//         const config = PROFILE_CONFIG[user.role];
//         if (config) await config.model.deleteMany({ userId: user._id });
//     }

//     const result = await User.deleteMany({ _id: { $in: deleteIds } });

//     return { deleteResult: { deletedCount: result.deletedCount } };
// };

export const getMyProfile = async (userId, role, schoolId, platform) => {

    // 1. Basic field validation
    if (!userId || !role || !schoolId || !platform) {
        throw new BadRequestError("All fields are required");
    }

    // 2. Super admin has no profile
    if (role === USER_ROLES.SUPER_ADMIN) {
        throw new ForbiddenError("Super admins do not have a profile");
    }

    // 3. Platform + role access rules
    if (platform === "mobile" && role === USER_ROLES.ADMIN) {
        throw new ForbiddenError("Access Denied: Admins cannot access profile via mobile");
    }

    if (platform === "web" && role === USER_ROLES.STUDENT) {
        throw new ForbiddenError("Access Denied: Students cannot access profile via web");
    }

    // 4. Role based profile populate
    const profileVirtualMap = {
        [USER_ROLES.STUDENT]: { path: "studentProfile", select: "-userId -__v" },
        [USER_ROLES.TEACHER]: { path: "teacherProfile", select: "-userId -__v" },
        [USER_ROLES.ADMIN]: { path: "adminProfile", select: "-userId -__v" },
    };

    const profilePopulate = profileVirtualMap[role] || null;

    // 5. Build query — NO .lean() so virtuals work
    let query = User.findOne({ _id: userId, schoolId, isArchived: false })
        .select("-password -refreshToken -refreshTokenHash -refreshTokenExpiresAt -__v")
        .populate("schoolId", "name code");

    if (profilePopulate) {
        query = query.populate(profilePopulate);
    }

    const user = await query;

    // 6. User not found
    if (!user) {
        throw new NotFoundError("User not found");
    }

    // 7. Active check
    if (!user.isActive) {
        throw new ForbiddenError("Your account has been deactivated");
    }

    // 8. Convert to plain object WITH virtuals resolved
    const userObj = user.toObject({ virtuals: true });

    // 9. Return clean response
    return {
        _id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role,
        contactNo: userObj.contactNo,
        avatarUrl: userObj.avatarUrl,
        mustChangePassword: userObj.mustChangePassword,
        lastLoginAt: userObj.lastLoginAt,
        isActive: userObj.isActive,
        school: userObj.schoolId,
        profile: userObj.studentProfile || userObj.teacherProfile || userObj.adminProfile || null
    };
}
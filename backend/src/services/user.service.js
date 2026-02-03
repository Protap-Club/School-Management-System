
import User from "../models/User.model.js";
import { PROFILE_CONFIG } from "../config/profiles.js";
import { sendCredentialsEmail } from "../utils/email.util.js";
import { CustomError } from "../utils/customError.js";

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
    if (!name) throw new CustomError("Name is required", 400);

    // Determine correct school context - use provided schoolId or fallback to creator's schoolId
    const targetSchoolId = userData.schoolId || creator.schoolId;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) throw new CustomError("Email already registered", 409);

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
        throw new CustomError(`No ${!isArchived ? 'archived' : 'active'} users found to update`, 404);
    }

    return { updateResult: result };
};

// PERMANENT DELETE (without transactions for standalone MongoDB)
export const hardDeleteUsers = async (creator, userIds) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const query = buildAccessQuery(creator, { userIds: ids, isArchived: true });

    const usersToDelete = await User.find(query);
    if (usersToDelete.length === 0) {
        throw new CustomError("Users must be archived before permanent deletion", 400);
    }

    const deleteIds = usersToDelete.map(u => u._id);

    // Delete Profiles first, then Users
    for (const user of usersToDelete) {
        const config = PROFILE_CONFIG[user.role];
        if (config) await config.model.deleteMany({ userId: user._id });
    }

    const result = await User.deleteMany({ _id: { $in: deleteIds } });

    return { deleteResult: { deletedCount: result.deletedCount } };
};
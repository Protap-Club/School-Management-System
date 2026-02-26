import User from "./model/User.model.js";
import TeacherProfile from "./model/TeacherProfile.model.js";
import { PROFILE_CONFIG } from "../../config/profiles.js";
import { sendCredentialsEmail } from "../../utils/email.util.js";
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from "../../utils/customError.js";
import { USER_ROLES, canManageRole } from "../../constants/userRoles.js";

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

    // Role-based scoping: what roles can you SEE?
    if (role && role !== 'all') {
        query.role = role;
    } else {
        // No explicit role filter — scope by the requester's role
        switch (creator.role) {
            case USER_ROLES.TEACHER:
                query.role = USER_ROLES.STUDENT;
                break;
            case USER_ROLES.ADMIN:
                query.role = { $in: [USER_ROLES.TEACHER, USER_ROLES.STUDENT] };
                break;
            case USER_ROLES.SUPER_ADMIN:
                query.role = { $in: [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT] };
                break;
            default:
                query.role = USER_ROLES.STUDENT;
        }
    }

    return query;
};

// CREATE USER 
export const createUser = async (creator, userData) => {
    const { name, email, role, skipEmail } = userData;

    // Ensure name is present
    if (!name) throw new BadRequestError("Name is required");

    // Hierarchy check: creator can only create roles below their own
    if (!canManageRole(creator.role, role)) {
        throw new ForbiddenError(`You cannot create a user with role '${role}'. You can only create roles below your own.`);
    }
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

    // For teachers: restrict to students from their assigned classes only
    if (creator.role === USER_ROLES.TEACHER && (query.role === USER_ROLES.STUDENT || !queryFilters.role)) {
        const teacherProfile = await TeacherProfile.findOne({ userId: creator._id })
            .select("assignedClasses")
            .lean();

        if (teacherProfile?.assignedClasses?.length) {
            // Build $or conditions for each assigned class (standard + section)
            const classConditions = teacherProfile.assignedClasses.map(cls => ({
                "profile.standard": cls.standard,
                "profile.section": cls.section
            }));

            // We need to use aggregation or post-filter via studentProfile
            // First, get student IDs from StudentProfile that match the teacher's classes
            const { default: StudentProfile } = await import("./model/StudentProfile.model.js");
            const matchingStudentProfiles = await StudentProfile.find({
                schoolId: creator.schoolId,
                $or: teacherProfile.assignedClasses.map(cls => ({
                    standard: cls.standard,
                    section: cls.section
                }))
            }).select("userId").lean();

            const allowedStudentIds = matchingStudentProfiles.map(sp => sp.userId);
            query._id = query._id
                ? { $in: allowedStudentIds.filter(id => query._id.$in?.includes(id.toString())) }
                : { $in: allowedStudentIds };
        }
    }

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
        totalCount,
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
            page: Number(page),
            pageSize: Number(pageSize),
            totalPages: Math.ceil(totalCount / Number(pageSize))
        }
    };
};

// GET MY PROFILE (for mobile — teacher/student self-view)
export const getMyProfile = async (userId) => {
    const user = await User.findById(userId)
        .select("-password")
        .populate("schoolId", "name code")
        .populate("studentProfile")
        .populate("teacherProfile")
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


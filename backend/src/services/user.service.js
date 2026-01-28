import mongoose from "mongoose";
import User from "../models/User.model.js";
import { PROFILE_CONFIG } from "../config/profiles.js";
import { sendCredentialsEmail } from "../utils/email.js";
import CustomError from "../utils/CustomError.js";

// Helper to build a query based on who is asking (The Filter Factory)
const buildAccessQuery = (creator, filters = {}) => {
    const { name, isArchived, role, ...otherFilters } = filters;
    const query = { 
        ...filters, 
        isArchived: isArchived || false };
        schoolId = creator.schoolId;
    
    // Teachers can only manage/see Students
    if (creator.role === 'teacher') {
        query.role = 'student';
    }

    return query;
};

// CREATE USER 
export const createUser = async (creator, userData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, email, role } = userData;

        // Ensure name is present
        if (!name) throw new CustomError("Name is required", 400);

        // Determine correct school context
        const targetSchoolId = creator.schoolId;
        
        // Safety check: Check if user exists within the session
        const existing = await User.findOne({ email }).session(session);
        if (existing) throw new CustomError("Email already registered", 409);

        // Generate credentials
        const plainPassword = Math.random().toString(36).slice(-8); // simple temp pass
        const config = PROFILE_CONFIG[role];

        // Step 1: Create User
        const [newUser] = await User.create([{
            ...userData,
            password: plainPassword, //  User model has a .pre('save') hook to hash this
            schoolId: targetSchoolId,
            createdBy: creator._id
        }], { session });

        // Step 2: Create Profile 
        if (config) {
            await config.model.create([{
                userId: newUser._id,
                schoolId: targetSchoolId,
                ...config.extractFields(userData)
            }], { session });
        }

        // Commit all changes
        await session.commitTransaction();

        // Send email AFTER successful DB commit
        sendCredentialsEmail(email, plainPassword).catch(err => console.error("Email failed", err));

        return newUser;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// GET USERS 
export const getUsers = async (creator, filters = {}) => {
    const query = buildAccessQuery(creator, filters);

    // .lean() makes it fast. .populate() grabs the linked profile data automatically.
    return await User.find(query)
        .select("-password")
        .populate("schoolId", "name code")
        .sort({ createdAt: -1 })
        .lean();
};

// TOGGLE ARCHIVE STATUS 
export const toggleUserStatus = async (creator, userIds, isArchived) => {
    const query = buildAccessQuery(creator, { _id: { $in: userIds } });

    // This updates multiple users at once safely
    const result = await User.updateMany(query, { $set: { isArchived } });

    if (result.matchedCount === 0) {
        throw new CustomError("No accessible users found to update", 404);
    }

    return result;
};

// PERMANENT DELETE 
export const hardDeleteUsers = async (creator, userIds) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        const query = buildAccessQuery(creator, { _id: { $in: ids }, isArchived: true });
        
        const usersToDelete = await User.find(query).session(session);
        if (usersToDelete.length === 0) throw new CustomError("Users must be archived before permanent deletion", 400);

        const deleteIds = usersToDelete.map(u => u._id);

        // Delete Profiles & Users together
        for (const user of usersToDelete) {
            const config = PROFILE_CONFIG[user.role];
            if (config) await config.model.deleteMany({ userId: user._id }, { session });
        }
        
        await User.deleteMany({ _id: { $in: deleteIds } }, { session });

        await session.commitTransaction();
        return { deletedCount: deleteIds.length };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
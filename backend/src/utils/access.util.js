import { USER_ROLES, VIEWABLE_ROLES } from "../constants/userRoles.js";
import { ForbiddenError } from "./customError.js";

/**
 * Builds a default database query scoped to the creator's school and their allowed roles.
 * @param {Object} creator - The user performing the action (req.user)
 * @param {Object} filters - Optional filters to apply
 * @returns {Object} query object for MongoDB/Mongoose
 */
export const buildAccessQuery = (creator, filters = {}) => {
    const { name, search, isArchived, role, userIds, ...otherFilters } = filters;
    const query = {
        schoolId: creator.schoolId,
        ...otherFilters
    };

    // Handle userIds -> _id conversion
    if (userIds) {
        query._id = { $in: Array.isArray(userIds) ? userIds : [userIds] };
    }

    query.isArchived = isArchived !== undefined ? isArchived : false;

    // Prefer server-side search to avoid sending huge user lists to the client.
    // This is used by admin-facing notice flows to lookup users across the school.
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    } else if (name) {
        query.name = { $regex: name, $options: "i" };
    }

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

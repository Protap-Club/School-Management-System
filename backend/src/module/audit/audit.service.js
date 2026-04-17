import { AuditLog } from './AuditLog.model.js';

/**
 * Creates an audit log entry in the database.
 * Designed as a fire-and-forget fn down the chain and never throws exceptions to the caller.
 * 
 * @param {Object} params
 * @param {string|null} params.schoolId - Ensure passed as null for super admin action inside the service calling it
 * @param {string} params.actorId 
 * @param {string} params.actorRole 
 * @param {string} params.action - Use AUDIT_ACTIONS enum
 * @param {string} [params.targetModel]
 * @param {string} [params.targetId]
 * @param {string} params.description - Human-readable explanation of the action
 * @param {Object} [params.metadata]
 * @param {string} [params.ip]
 * @param {string} [params.userAgentString] - Unparsed user agent string which will be parsed into `Chrome / Windows`
 */
export const createAuditLog = async ({
    schoolId = null,
    actorId,
    actorRole,
    action,
    targetModel,
    targetId,
    description,
    metadata = {},
    ip,
    userAgentString
}) => {
    try {
        // Truncate userAgent "Chrome / Windows" format
        let userAgent = 'Unknown';
        if (userAgentString) {
            const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera)/i;
            const osRegex = /(Windows|Mac OS|Linux|Android|iOS)/i;
            const browserMatch = userAgentString.match(browserRegex);
            const osMatch = userAgentString.match(osRegex);
            
            const browser = browserMatch ? browserMatch[0] : 'Unknown Browser';
            const os = osMatch ? osMatch[0] : 'Unknown OS';
            
            userAgent = `${browser} / ${os}`;
        }

        await AuditLog.create({
            schoolId,
            actorId,
            actorRole,
            action,
            targetModel,
            targetId,
            description,
            metadata,
            ip,
            userAgent
        });
    } catch (error) {
        // Fire and forget; do not throw to caller
        console.error('Audit Log Creation Failed:', error);
    }
};

/**
 * Retrieves audit logs for a given school.
 */
export const getAuditLogs = async ({ schoolId, page = 1, limit = 20, filters = {} }) => {
    // Only fetch for specific school
    const query = { schoolId };
    
    if (filters.action) {
        query.action = filters.action;
    }
    if (filters.actorId) {
        query.actorId = filters.actorId;
    }
    if (filters.actorRole) {
        query.actorRole = filters.actorRole;
    }
    if (filters.targetModel) {
        query.targetModel = filters.targetModel;
    }
    if (filters.search) {
        query.description = { $regex: filters.search, $options: 'i' };
    }
    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endDate;
        }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('actorId', 'name email avatarUrl role'),
        AuditLog.countDocuments(query)
    ]);

    return {
        data: logs,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
        }
    };
};

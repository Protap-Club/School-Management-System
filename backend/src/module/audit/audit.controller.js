import * as auditService from './audit.service.js';
import { sendPaginated } from '../../utils/response.util.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * Get audit logs for a school
 * Admin/SuperAdmin only (verified by middleware)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
    // req.schoolId is enforced by school.middleware.js
    const { page, limit, action, actorId } = req.query;

    const result = await auditService.getAuditLogs({
        schoolId: req.schoolId,
        page,
        limit,
        filters: { action, actorId }
    });

    return sendPaginated(
        res,
        result.data,
        result.pagination,
        "Audit logs retrieved successfully"
    );
});

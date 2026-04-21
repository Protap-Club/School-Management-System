import { randomBytes } from 'crypto';
import { AuditLog } from './AuditLog.model.js';
import {
    ACTION_TYPE_MAP,
    SEVERITY_MAP,
    OUTCOME_VALUES,
} from '../../constants/auditActions.js';
import logger from '../../config/logger.js';

/**
 * Creates an audit log entry in the database.
 * Designed as a fire-and-forget fn down the chain and never throws exceptions to the caller.
 *
 * @param {Object} params
 * @param {string|null}  params.schoolId       - Pass null for super_admin platform actions
 * @param {string}       params.actorId
 * @param {string}       params.actorRole
 * @param {string}       params.action         - Use AUDIT_ACTIONS enum (raw action string)
 * @param {string}       [params.action_type]  - Overrides auto-derived value from ACTION_TYPE_MAP
 * @param {string}       [params.severity]     - Overrides auto-derived value from SEVERITY_MAP
 * @param {string}       [params.outcome]      - 'SUCCESS' | 'FAILED' (default: 'SUCCESS')
 * @param {string}       [params.session_id]   - Short hex hash identifying the user session
 * @param {string}       [params.targetModel]
 * @param {string}       [params.targetId]
 * @param {string}       params.description    - Human-readable explanation of the action
 * @param {Object}       [params.metadata]     - Freeform bag; include `changes` array for UPDATE diffs
 * @param {Array}        [params.changes]      - [{field, before, after}] merged into metadata.changes
 * @param {string}       [params.ip]
 * @param {string}       [params.userAgentString] - Raw UA string; parsed to "Chrome / Windows"
 */
export const createAuditLog = async ({
    schoolId = null,
    actorId,
    actorRole,
    action,
    action_type,
    severity,
    outcome = OUTCOME_VALUES.SUCCESS,
    session_id,
    targetModel,
    targetId,
    description,
    metadata = {},
    changes,
    ip,
    userAgentString
}) => {
    try {
        // ── Derive action_type from action string if not explicitly provided ──
        const resolvedActionType = action_type ?? ACTION_TYPE_MAP[action] ?? null;

        // ── Derive severity from action_type if not explicitly provided ──
        const resolvedSeverity = severity ?? (resolvedActionType ? SEVERITY_MAP[resolvedActionType] : null);

        // ── Parse user agent into "Chrome / Windows" format ──
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

        // ── Merge changes array into metadata if provided ──
        const finalMetadata = { ...metadata };
        if (Array.isArray(changes) && changes.length > 0) {
            finalMetadata.changes = changes;
        }

        await AuditLog.create({
            schoolId,
            actorId,
            actorRole,
            action,
            action_type: resolvedActionType,
            severity: resolvedSeverity,
            outcome,
            session_id,
            targetModel,
            targetId,
            description,
            metadata: finalMetadata,
            ip,
            userAgent
        });

        // ── Terminal Logging for System Admin (All Schools) ──
        // requestId: prefer one injected by the caller via metadata, fall back to a
        // short random hex token so every log line is uniquely traceable.
        const requestId = metadata?.requestId ?? randomBytes(4).toString('hex');

        logger.info({
            audit:        true,
            schoolId:     schoolId || 'SUPER_ADMIN',
            actorId,
            actorRole:    actorRole ? String(actorRole).toUpperCase() : undefined,
            action,
            action_type:  resolvedActionType,
            severity:     resolvedSeverity,
            outcome,
            resourceType: targetModel  ?? undefined,
            resourceId:   targetId     ? String(targetId) : undefined,
            ip:           ip           ?? undefined,
            sessionId:    session_id   ?? undefined,
            requestId,
        }, `[SYSTEM AUDIT] ${description}`);
    } catch (error) {
        // Fire and forget; do not throw to caller
        logger.error({ err: error }, 'Audit Log Creation Failed');
    }
};

/**
 * Retrieves audit logs for a given school with filtering and pagination.
 *
 * @param {Object} params
 * @param {string}  params.schoolId
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=20]
 * @param {Object}  [params.filters]
 * @param {string}  [params.filters.action]       - Raw action string (e.g. 'user.created')
 * @param {string}  [params.filters.action_type]  - Enum: LOGIN|LOGOUT|CREATE|UPDATE|DELETE|BROADCAST
 * @param {string}  [params.filters.severity]     - Enum: LOW|MEDIUM|HIGH
 * @param {string}  [params.filters.outcome]      - Enum: SUCCESS|FAILED
 * @param {string}  [params.filters.actorId]
 * @param {string}  [params.filters.actorRole]
 * @param {string}  [params.filters.targetModel]
 * @param {string}  [params.filters.search]       - Regex search on description
 * @param {string}  [params.filters.startDate]
 * @param {string}  [params.filters.endDate]
 */
export const getAuditLogs = async ({ schoolId, page = 1, limit = 20, filters = {} }) => {
    const query = {};
    if (schoolId) {
        query.schoolId = schoolId;
    }

    // ── Existing filters ──
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

    // ── New structured filters ──
    if (filters.action_type) {
        query.action_type = filters.action_type;
    }
    if (filters.severity) {
        query.severity = filters.severity;
    }
    if (filters.outcome) {
        query.outcome = filters.outcome;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('actorId', 'name email avatarUrl role')
            .populate('schoolId', 'name'),
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



import { z } from 'zod';
import { ACTION_TYPES, SEVERITY_LEVELS, OUTCOME_VALUES } from '../../constants/auditActions.js';

/**
 * Zod helper: tolerates empty string query params (sent when a filter dropdown
 * is unselected) by coercing '' → undefined before the enum check.
 */
const optionalEnum = (values) =>
    z.string()
     .optional()
     .transform(v => v || undefined)
     .pipe(z.enum(values).optional());

export const getAuditLogsSchema = z.object({
    query: z.object({
        page:        z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
        limit:       z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
        // Existing filters
        action:      z.string().optional(),
        actorId:     z.string().optional(), // MongoDB ObjectId string
        actorRole:   z.string().optional(),
        targetModel: z.string().optional(),
        search:      z.string().optional(),
        startDate:   z.string().optional(),
        endDate:     z.string().optional(),
        // New structured filters — use optionalEnum so '' is treated as "no filter"
        action_type: optionalEnum(Object.values(ACTION_TYPES)),
        severity:    optionalEnum(Object.values(SEVERITY_LEVELS)),
        outcome:     optionalEnum(Object.values(OUTCOME_VALUES)),
    })
});

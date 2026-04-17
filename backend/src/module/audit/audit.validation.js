import { z } from 'zod';
import { ACTION_TYPES, SEVERITY_LEVELS, OUTCOME_VALUES } from '../../constants/auditActions.js';

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
        // New structured filters
        action_type: z.enum(Object.values(ACTION_TYPES)).optional(),
        severity:    z.enum(Object.values(SEVERITY_LEVELS)).optional(),
        outcome:     z.enum(Object.values(OUTCOME_VALUES)).optional(),
    })
});


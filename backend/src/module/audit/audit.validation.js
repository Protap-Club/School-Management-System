import { z } from 'zod';

export const getAuditLogsSchema = z.object({
    query: z.object({
        page: z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
        limit: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)),
        action: z.string().optional(),
        actorId: z.string().optional() // MongoDB ObjectId string
    })
});

import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ═══════════════════════════════════════════════════════════════
// Notice Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Create Notice — body is multipart/form-data so recipients comes as JSON string
export const createNoticeSchema = z.object({
    body: z.object({
        message: z.string({ required_error: "Message is required" }).min(1, "Message cannot be empty"),
        title: z.string().optional().default(""),
        recipientType: z.enum(["all", "classes", "users", "students", "groups"], {
            required_error: "Recipient type is required"
        }),
        // Recipients comes as JSON string from FormData
        recipients: z.string().optional().default("[]"),
        // Sent as string from FormData: "true" → true, anything else (including "false") → false.
        // z.coerce.boolean() CANNOT be used here because Boolean("false") === true in JS
        // (any non-empty string is truthy), which caused every notice to be saved with
        // requiresAcknowledgment: true regardless of the toggle state.
        requiresAcknowledgment: z.union([z.boolean(), z.string()])
            .transform(val => val === true || val === 'true')
            .optional()
            .default(false),
    })
});

// Get Notices — query filters
export const getNoticesQuerySchema = z.object({
    query: z.object({
        type: z.enum(["all", "notice", "file"]).optional().default("all"),
        sentTo: z.enum(["all", "group", "individual"]).optional().default("all"),
        date: z.enum(["all", "today", "last7", "last30"]).optional().default("all"),
    }).optional()
});

// Notice ID param
export const noticeIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

// ═══════════════════════════════════════════════════════════════
// Group Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Create Group
export const createGroupSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Group name is required" }).min(1, "Group name cannot be empty").trim(),
        students: z.array(objectIdSchema, { required_error: "Students array is required" }).min(1, "At least one member is required"),
    })
});

// Group ID param
export const groupIdParamsSchema = z.object({
    params: z.object({
        groupId: objectIdSchema
    })
});

// ═══════════════════════════════════════════════════════════════
// Acknowledgment Validation Schemas
// ═══════════════════════════════════════════════════════════════

// POST /notices/:id/acknowledge — validates ID param + optional response message
export const acknowledgeNoticeSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        responseMessage: z.string()
            .trim()
            .min(2, 'Response message must be at least 2 characters long')
            .max(500, 'Response message cannot exceed 500 characters')
            .optional()
            .default(''),
    }),
});

// GET /notices/:id/acknowledgments — same param shape
export const getAcknowledgmentsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    })
});

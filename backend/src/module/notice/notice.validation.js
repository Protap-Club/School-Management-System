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

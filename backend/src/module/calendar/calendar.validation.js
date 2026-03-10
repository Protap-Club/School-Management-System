import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ═══════════════════════════════════════════════════════════════
// Calendar Event Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Create Event
export const createEventSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }).min(1, "Title cannot be empty").trim(),
        start: z.string({ required_error: "Start date is required" }).refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid start date format",
        }),
        end: z.string({ required_error: "End date is required" }).refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid end date format",
        }),
        allDay: z.boolean().optional().default(true),
        type: z.enum(["national", "exam", "custom", "event"]).optional().default("event"),
        description: z.string().optional(),
        targetAudience: z.enum(["all", "classes"]).optional().default("all"),
        targetClasses: z.array(z.string()).optional().default([]),
    }).refine(data => new Date(data.start) <= new Date(data.end), {
        message: "End date must be after or equal to start date",
        path: ["end"],
    }),
});

// Update Event — all fields optional
export const updateEventSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        title: z.string().min(1, "Title cannot be empty").trim().optional(),
        start: z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid start date format",
        }).optional(),
        end: z.string().refine(val => !isNaN(Date.parse(val)), {
            message: "Invalid end date format",
        }).optional(),
        allDay: z.boolean().optional(),
        type: z.enum(["national", "exam", "custom", "event"]).optional(),
        description: z.string().optional(),
        targetAudience: z.enum(["all", "classes"]).optional(),
        targetClasses: z.array(z.string()).optional(),
    }),
});

// Event ID param
export const eventIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

// Get Events query
export const getEventsQuerySchema = z.object({
    query: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
        type: z.enum(["national", "exam", "custom", "event"]).optional(),
        upcoming: z.union([z.string(), z.boolean()]).optional(),
        limit: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    }).optional(),
});

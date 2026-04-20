import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Schema for creating a proxy request (teacher marks unavailable)
 */
export const createProxyRequestSchema = z.object({
    body: z.object({
        date: z.string({ required_error: "Date is required" }),
        dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
        timeSlotId: objectIdSchema,
        reason: z.string().max(500, "Reason cannot exceed 500 characters").optional()
    })
});

/**
 * Schema for getting proxy requests (with filters)
 */
export const getProxyRequestsSchema = z.object({
    query: z.object({
        status: z.enum(["pending", "resolved", "cancelled"]).optional(),
        date: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        datePreset: z.enum(["all", "today", "last7", "last30", "custom"]).optional(),
        teacherId: objectIdSchema.optional(),
        page: z.string().optional().default("0"),
        pageSize: z.string().optional().default("25")
    })
});

/**
 * Schema for getting available teachers for a proxy slot
 */
export const getAvailableTeachersSchema = z.object({
    query: z.object({
        date: z.string({ required_error: "Date is required" }),
        dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
        timeSlotId: objectIdSchema,
        subject: z.string().optional(),
        standard: z.string().optional(),
        section: z.string().optional()
    })
});

/**
 * Schema for assigning a proxy teacher (admin action)
 */
export const assignProxyTeacherSchema = z.object({
    params: z.object({
        requestId: objectIdSchema
    }),
    body: z.object({
        proxyTeacherId: objectIdSchema,
        notes: z.string().max(500).optional()
    })
});

/**
 * Schema for marking as free period (admin action)
 */
export const markAsFreePeriodSchema = z.object({
    params: z.object({
        requestId: objectIdSchema
    }),
    body: z.object({
        notes: z.string().max(500).optional()
    })
});

/**
 * Schema for updating an existing proxy assignment (admin action)
 */
export const updateProxyAssignmentSchema = z.object({
    params: z.object({
        assignmentId: objectIdSchema
    }),
    body: z.object({
        type: z.enum(["proxy", "free_period"], { required_error: "Type is required (proxy or free_period)" }),
        proxyTeacherId: objectIdSchema.optional(),
        notes: z.string().max(500).optional()
    }).refine(data => {
        // If type is proxy, proxyTeacherId must be provided
        if (data.type === "proxy" && !data.proxyTeacherId) {
            return false;
        }
        return true;
    }, {
        message: "proxyTeacherId is required when type is 'proxy'",
        path: ["proxyTeacherId"]
    })
});

/**
 * Schema for direct proxy assignment (admin creates without teacher request)
 */
export const createDirectAssignmentSchema = z.object({
    body: z.object({
        originalTeacherId: objectIdSchema,
        proxyTeacherId: objectIdSchema.optional(),
        type: z.enum(["proxy", "free_period"]),
        standard: z.string({ required_error: "Standard is required" }),
        section: z.string({ required_error: "Section is required" }),
        subject: z.string().optional(),
        date: z.string({ required_error: "Date is required" }),
        dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
        timeSlotId: objectIdSchema,
        notes: z.string().max(500).optional()
    }).refine(data => {
        // If type is proxy, proxyTeacherId must be provided
        if (data.type === "proxy" && !data.proxyTeacherId) {
            return false;
        }
        return true;
    }, {
        message: "proxyTeacherId is required when type is 'proxy'",
        path: ["proxyTeacherId"]
    })
});

/**
 * Schema for getting proxy assignments for a date
 */
export const getProxyAssignmentsSchema = z.object({
    query: z.object({
        date: z.string({ required_error: "Date is required" })
    })
});

/**
 * Schema for getting timetable with proxy overrides
 */
export const getTimetableWithProxiesSchema = z.object({
    query: z.object({
        standard: z.string({ required_error: "Standard is required" }),
        section: z.string({ required_error: "Section is required" }),
        date: z.string({ required_error: "Date is required" })
    })
});

/**
 * Schema for cancelling a proxy request
 */
export const cancelProxyRequestSchema = z.object({
    params: z.object({
        requestId: objectIdSchema
    })
});

/**
 * Schema for getting teacher schedule with proxies
 */
export const getTeacherScheduleSchema = z.object({
    query: z.object({
        date: z.string({ required_error: "Date is required" })
    })
});

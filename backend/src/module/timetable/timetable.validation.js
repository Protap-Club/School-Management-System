import { z } from 'zod';
import { DAYS_OF_WEEK } from './Timetable.model.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ═══════════════════════════════════════════════════════════════
// TimeSlot Validation Schemas
// ═══════════════════════════════════════════════════════════════

export const createTimeSlotSchema = z.object({
    body: z.object({
        slotNumber: z.number({ required_error: "Slot number is required" }).int().positive(),
        startTime: z.string({ required_error: "Start time is required" }).nonempty(),
        endTime: z.string({ required_error: "End time is required" }).nonempty(),
        slotType: z.enum(["CLASS", "BREAK"]).optional().default("CLASS"),
        label: z.string().optional()
    })
});

export const updateTimeSlotSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        slotNumber: z.number().int().positive().optional(),
        startTime: z.string().nonempty().optional(),
        endTime: z.string().nonempty().optional(),
        slotType: z.enum(["CLASS", "BREAK"]).optional(),
        label: z.string().optional(),
        isActive: z.boolean().optional()
    })
});

export const timeSlotIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

// ═══════════════════════════════════════════════════════════════
// Timetable Validation Schemas
// ═══════════════════════════════════════════════════════════════

export const createTimetableSchema = z.object({
    body: z.object({
        standard: z.string({ required_error: "Standard is required" }).nonempty(),
        section: z.string({ required_error: "Section is required" }).nonempty(),
        academicYear: z.number({ required_error: "Academic year is required" }).int().min(2000).max(2100)
    })
});

export const timetableIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

export const updateTimetableStatusSchema = z.object({
    params: z.object({
        id: objectIdSchema
    }),
    body: z.object({
        status: z.enum(["DRAFT", "PUBLISHED"])
    })
});

// ═══════════════════════════════════════════════════════════════
// TimetableEntry Validation Schemas
// ═══════════════════════════════════════════════════════════════

// Single entry for CLASS slot (requires subject + teacherId)
const classEntrySchema = z.object({
    dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
    timeSlotId: objectIdSchema,
    subject: z.string({ required_error: "Subject is required for class slots" }).nonempty(),
    teacherId: objectIdSchema,
    roomNumber: z.string().optional(),
    notes: z.string().optional()
});

// Single entry for BREAK slot (no subject/teacher needed)
const breakEntrySchema = z.object({
    dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
    timeSlotId: objectIdSchema,
    subject: z.string().optional().nullable(),
    teacherId: z.string().optional().nullable(),
    roomNumber: z.string().optional(),
    notes: z.string().optional()
});

// Combined entry schema (validation switches based on slot type in service layer)
export const createEntrySchema = z.object({
    params: z.object({
        id: objectIdSchema // timetableId
    }),
    body: z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK, { required_error: "Day of week is required" }),
        timeSlotId: objectIdSchema,
        subject: z.string().optional().nullable(),
        teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId').optional().nullable(),
        roomNumber: z.string().optional(),
        notes: z.string().optional()
    })
});

export const createBulkEntriesSchema = z.object({
    params: z.object({
        id: objectIdSchema // timetableId
    }),
    body: z.object({
        entries: z.array(z.object({
            dayOfWeek: z.enum(DAYS_OF_WEEK),
            timeSlotId: objectIdSchema,
            subject: z.string().optional().nullable(),
            teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId').optional().nullable(),
            roomNumber: z.string().optional(),
            notes: z.string().optional()
        })).nonempty("Entries array cannot be empty")
    })
});

export const updateEntrySchema = z.object({
    params: z.object({
        entryId: objectIdSchema // entryId parameter name
    }),
    body: z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK).optional(),
        timeSlotId: objectIdSchema.optional(),
        subject: z.string().optional().nullable(),
        teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId').optional().nullable(),
        roomNumber: z.string().optional(),
        notes: z.string().optional()
    })
});

export const entryIdParamsSchema = z.object({
    params: z.object({
        entryId: objectIdSchema
    })
});

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule Validation
// ═══════════════════════════════════════════════════════════════

export const teacherScheduleParamsSchema = z.object({
    params: z.object({
        teacherId: objectIdSchema
    }),
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined)
    }).optional()
});

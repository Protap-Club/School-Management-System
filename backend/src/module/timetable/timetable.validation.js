import { z } from 'zod';
import { DAYS_OF_WEEK } from './Timetable.model.js';

// reusable schema for validating MongoDB ObjectId format (24-char hex string)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// TIMESLOT VALIDATION

// validates request body when creating a new time slot
export const createTimeSlotSchema = z.object({
    body: z.object({
        slotNumber: z.number({ required_error: "Slot number is required" }).int().positive(),
        startTime: z.string({ required_error: "Start time is required" }).nonempty(),
        endTime: z.string({ required_error: "End time is required" }).nonempty(),
        slotType: z.enum(["CLASS", "BREAK"]).optional().default("CLASS"),
        label: z.string().optional()
    })
});

// validates params + body when updating a time slot
// all body fields are optional since it's a partial update
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

// validates the :id param for time slot routes (delete, etc.)
export const timeSlotIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

// TIMETABLE VALIDATION

// validates request body when creating a new timetable header
export const createTimetableSchema = z.object({
    body: z.object({
        standard: z.string({ required_error: "Standard is required" }).nonempty(),
        section: z.string({ required_error: "Section is required" }).nonempty(),
        academicYear: z.number({ required_error: "Academic year is required" }).int().min(2000).max(2100)
    })
});

// validates the :id param for timetable routes (get by id, delete, etc.)
export const timetableIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema
    })
});

// ENTRY VALIDATION

// validates request when adding a single entry to a timetable
// teacherId and subject are optional to allow break periods (no teacher assigned)
export const createEntrySchema = z.object({
    params: z.object({
        id: objectIdSchema // timetableId from URL
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

// bulk entry creation — commented out for now, uncomment when bulk endpoint is added
// export const createBulkEntriesSchema = z.object({
//     params: z.object({
//         id: objectIdSchema // timetableId from URL
//     }),
//     body: z.object({
//         entries: z.array(z.object({
//             dayOfWeek: z.enum(DAYS_OF_WEEK),
//             timeSlotId: objectIdSchema,
//             subject: z.string().optional().nullable(),
//             teacherId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId').optional().nullable(),
//             roomNumber: z.string().optional(),
//             notes: z.string().optional()
//         })).nonempty("Entries array cannot be empty")
//     })
// });

// validates request when updating an existing entry
// all body fields are optional since it's a partial update
export const updateEntrySchema = z.object({
    params: z.object({
        entryId: objectIdSchema
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

// validates the :entryId param for entry routes (update, delete)
export const entryIdParamsSchema = z.object({
    params: z.object({
        entryId: objectIdSchema
    })
});

// SCHEDULE VALIDATION

// validates params + optional query when viewing a specific teacher's schedule
// academicYear query param is optional — if not provided, returns all years
export const teacherScheduleParamsSchema = z.object({
    params: z.object({
        teacherId: objectIdSchema
    }),
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined)
    }).optional()
});

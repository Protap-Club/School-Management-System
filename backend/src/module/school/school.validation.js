import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const updateSchoolSchema = z.object({
    params: z.object({
        id: objectIdSchema.optional(),
    }).optional(),
    body: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        contactEmail: z.string().email('Invalid email address').optional(),
        contactPhone: z.string().optional(),
        theme: z.object({
            accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color code').optional(),
        }).optional(),
    }),
});

export const uploadLogoSchema = z.object({
    body: z.object({
        schoolId: objectIdSchema.optional(),
    }),
});

export const updateFeaturesSchema = z.object({
    body: z.object({
        features: z.object({
            attendance: z.boolean().optional(),
            fees: z.boolean().optional(),
            timetable: z.boolean().optional(),
            library: z.boolean().optional(),
            transport: z.boolean().optional(),
            notice: z.boolean().optional(),
            calendar: z.boolean().optional(),
            examination: z.boolean().optional(),
            assignment: z.boolean().optional(),
            result: z.boolean().optional(),
        }),
    }),
});

export const upsertClassSectionSchema = z.object({
    body: z.object({
        standard: z
            .string()
            .trim()
            .min(1, 'Class is required')
            .regex(/^[A-Za-z0-9_]+$/, 'Class must be alphanumeric (letters, numbers, underscore only)'),
        section: z
            .string()
            .trim()
            .min(1, 'Section is required')
            .regex(/^[A-Za-z0-9_]+$/, 'Section must be alphanumeric (letters, numbers, underscore only)'),
    }),
});

export const removeClassSectionSchema = z.object({
    body: z.object({
        standard: z.string().trim().min(1, 'Class is required'),
        section: z.string().trim().min(1, 'Section is required'),
        transferTo: z.object({
            standard: z.string().trim().min(1, 'Temporary class is required'),
            section: z.string().trim().min(1, 'Temporary section is required'),
        }).optional(),
        teacherTransferTo: z.object({
            standard: z.string().trim().min(1, 'Teacher class is required'),
            section: z.string().trim().min(1, 'Teacher section is required'),
        }).optional(),
        teacherAction: z.string().trim().optional(),
    }),
});

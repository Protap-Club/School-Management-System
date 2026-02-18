import { z } from 'zod';
import { USER_ROLES } from '../../constants/userRoles.js';

// Schema for ObjectId validation
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createSchoolSchema = z.object({
    body: z.object({
        name: z.string().nonempty('School name is required'),
        code: z.string().nonempty('School code is required').toUpperCase(),
        address: z.string().optional(),
        contactEmail: z.string().email('Invalid email address').optional(),
        contactPhone: z.string().optional(),
    }),
});

export const updateSchoolSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        contactEmail: z.string().email('Invalid email address').optional(),
        contactPhone: z.string().optional(),
    }),
});

export const schoolIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

export const uploadLogoSchema = z.object({
    body: z.object({
        schoolId: objectIdSchema.optional(),
    }),
});

export const updateThemeSchema = z.object({
    body: z.object({
        schoolId: objectIdSchema.optional(),
        theme: z.object({
            accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color code').optional(),
        }).optional(),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color code').optional(),
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
        }),
    }),
});

export const toggleFeatureSchema = z.object({
    params: z.object({
        id: objectIdSchema,
        featureKey: z.string(),
    }),
    body: z.object({
        enabled: z.boolean(),
    }),
});

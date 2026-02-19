import { z } from 'zod';
import { USER_ROLES } from '../../constants/userRoles.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createUserSchema = z.object({
    body: z.object({
        name: z.string().nonempty('Name is required'),
        email: z.string().email('Invalid email address'),
        role: z.enum(USER_ROLES),
        schoolId: objectIdSchema.optional(),
        // Profile fields are optional at creation, can be updated later
        profile: z.object({}).optional(),
    }),
});

export const getUsersSchema = z.object({
    query: z.object({
        schoolId: objectIdSchema.optional(),
        role: z.enum(USER_ROLES).optional(),
        isArchived: z.union([z.string(), z.boolean()]).optional().transform(val => val === 'true' || val === true),
        page: z.union([z.string(), z.number()]).optional().default('0').transform(val => Number(val)),
        pageSize: z.union([z.string(), z.number()]).optional().default('25').transform(val => Number(val)),
    }),
});

export const userIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

export const userIdsBodySchema = z.object({
    body: z.object({
        userIds: z.array(objectIdSchema).nonempty('User IDs array cannot be empty'),
        isArchived: z.boolean().optional(),
    }),
});

export const getProfileSchema = z.object({
    params: z.object({
        id: objectIdSchema.optional(),
    }),
    query: z.object({
        platform: z.string().optional(),
    }),
});

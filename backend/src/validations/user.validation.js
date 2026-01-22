import { z } from 'zod';
import { VALID_ROLES } from '../constants/userRoles.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const createUserSchema = z.object({
    body: z.object({
        name: z.string().nonempty('Name is required'),
        email: z.string().email('Invalid email address'),
        role: z.enum(VALID_ROLES),
        schoolId: objectIdSchema.optional(),
        // Profile fields are optional at creation, can be updated later
        profile: z.object({}).optional(),
    }),
});

export const getUsersSchema = z.object({
    query: z.object({
        schoolId: objectIdSchema.optional(),
        role: z.enum(VALID_ROLES).optional(),
        page: z.string().optional().default('0').transform(Number),
        pageSize: z.string().optional().default('25').transform(Number),
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
    }),
});

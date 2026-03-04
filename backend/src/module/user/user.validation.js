import { z } from 'zod';
import { USER_ROLES } from '../../constants/userRoles.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const roleValues = Object.values(USER_ROLES);

// ─── Create User ────────────────────────────────────────────────────
export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().trim().email('Invalid email address'),
        contactNo: z.string().optional(),
        role: z.enum(roleValues, {
            errorMap: () => ({ message: `Role must be one of: ${roleValues.join(', ')}` })
        }),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
        schoolId: objectIdSchema.optional(),
        skipEmail: z.boolean().optional(),

        // Student profile fields
        rollNumber: z.string().optional(),
        standard: z.string().optional(),
        section: z.string().optional(),
        year: z.coerce.number().optional(),
        admissionDate: z.string().optional(),
        fatherName: z.string().optional(),
        fatherContact: z.string().optional(),
        motherName: z.string().optional(),
        motherContact: z.string().optional(),
        address: z.string().optional(),

        // Teacher profile fields
        employeeId: z.string().optional(),
        qualification: z.string().optional(),
        joiningDate: z.string().optional(),
        assignedClasses: z.array(z.object({
            standard: z.string(),
            section: z.string(),
            subjects: z.array(z.string()).optional(),
        })).optional(),

        // Admin profile fields
        department: z.string().optional(),
        permissions: z.array(z.string()).optional(),
    }),
});

// ─── Get Users (query params) ───────────────────────────────────────
export const getUsersSchema = z.object({
    query: z.object({
        role: z.enum([...roleValues, 'all']).optional(),
        isArchived: z.union([z.string(), z.boolean()]).optional()
            .transform(val => val === 'true' || val === true),
        page: z.union([z.string(), z.number()]).optional().default('0')
            .transform(val => Number(val)),
        pageSize: z.union([z.string(), z.number()]).optional().default('25')
            .transform(val => Number(val)),
        name: z.string().optional(),
    }),
});

// ─── Single User Params ─────────────────────────────────────────────
export const userIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

// ─── Bulk User IDs Body ─────────────────────────────────────────────
export const userIdsBodySchema = z.object({
    body: z.object({
        userIds: z.array(objectIdSchema).nonempty('User IDs array cannot be empty'),
        isArchived: z.boolean({ required_error: 'isArchived is required' }),
    }),
});

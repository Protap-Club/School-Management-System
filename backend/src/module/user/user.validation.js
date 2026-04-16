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
        guardianName: z.string().optional(),
        guardianContact: z.string().optional(),
        address: z.string().optional(),

        // Teacher profile fields
        employeeId: z.string().optional(),
        qualification: z.string().optional(),
        joiningDate: z.string().optional(),
        expectedSalary: z.coerce.number().gt(100, 'Expected salary must be more than 100').optional(),
        assignedClasses: z.array(z.object({
            standard: z.string(),
            section: z.string(),
            subjects: z.array(z.string()).optional(),
        })).optional(),

        // Admin profile fields
        department: z.string().optional(),
        permissions: z.array(z.string()).optional(),
    }).superRefine((data, ctx) => {
        const { role } = data;

        if (role === USER_ROLES.STUDENT) {
            const required = ['rollNumber', 'standard', 'section'];
            required.forEach(field => {
                if (!data[field]) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required for students`,
                        path: [field]
                    });
                }
            });
        } else if (role === USER_ROLES.TEACHER) {
            // employeeId, qualification, joiningDate are optional at creation —
            // they can be updated later via the profile edit form.
        } else if (role === USER_ROLES.ADMIN) {
            if (!data.department) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Department is required for admins',
                    path: ['department']
                });
            }
        }
    }),
});

// ─── Get Users (query params) ───────────────────────────────────────
export const createTeacherStudentSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, 'Name is required'),
        email: z.string().trim().email('Invalid email address'),
        contactNo: z.string().trim().optional(),
        rollNumber: z.string().trim().min(1, 'Roll number is required'),
        standard: z.string().trim().min(1, 'Standard is required'),
        section: z.string().trim().min(1, 'Section is required'),
        fatherName: z.string().trim().optional(),
        fatherContact: z.string().trim().optional(),
        motherName: z.string().trim().optional(),
        motherContact: z.string().trim().optional(),
        guardianName: z.string().trim().optional(),
        guardianContact: z.string().trim().optional(),
        address: z.string().trim().optional(),
    }).strict().superRefine((data, ctx) => {
        const rollNumberValue = Number(data.rollNumber);
        if (!Number.isFinite(rollNumberValue) || rollNumberValue <= 0 || !/^\d+$/.test(data.rollNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Roll number must be a positive number',
                path: ['rollNumber'],
            });
        }

        const hasParentOrGuardianName = [
            data.fatherName,
            data.motherName,
            data.guardianName,
        ].some((value) => String(value || '').trim().length > 0);

        if (!hasParentOrGuardianName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one of fatherName, motherName, or guardianName is required',
                path: ['guardianName'],
            });
        }
    }),
});

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
        // Server-side search (e.g., admin user search in notice flows)
        // keeps large user lists off the client while still allowing lookup.
        search: z.string().optional(),
    }),
});

// ─── Get Subject Teacher (query params) ─────────────────────────────
export const getSubjectTeacherSchema = z.object({
    query: z.object({
        standard: z.string().min(1, 'Standard is required'),
        section: z.string().min(1, 'Section is required'),
        subject: z.string().min(1, 'Subject is required'),
    }),
});

// ─── Get Next Roll Number (query params) ───────────────────────────
export const getNextRollNumberSchema = z.object({
    query: z.object({
        standard: z.string().min(1, 'Standard is required'),
        section: z.string().min(1, 'Section is required'),
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
        replacementTeacherId: objectIdSchema.optional(),
        skipReplacement: z.boolean().optional(),
    }),
});

export const updateTeacherProfileSchema = z.object({
    params: userIdParamsSchema.shape.params,
    body: z.object({
        expectedSalary: z.coerce.number().gt(100, 'Expected salary must be more than 100').optional(),
    }).strict()
});

const classAssignmentSchema = z.object({
    standard: z.string(),
    section: z.string(),
    subjects: z.array(z.string()).optional(),
});

const profileUpdateSchema = z.object({
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
    guardianName: z.string().optional(),
    guardianContact: z.string().optional(),
    address: z.string().optional(),

    // Teacher profile fields
    employeeId: z.string().optional(),
    qualification: z.string().optional(),
    joiningDate: z.string().optional(),
    expectedSalary: z.coerce.number().gt(100, 'Expected salary must be more than 100').optional(),
    assignedClasses: z.array(classAssignmentSchema).optional(),

    // Admin profile fields
    department: z.string().optional(),
    permissions: z.array(z.string()).optional(),
}).strict();

export const updateUserSchema = z.object({
    params: userIdParamsSchema.shape.params,
    body: z.object({
        name: z.string().min(1, 'Name is required').optional(),
        email: z.string().trim().email('Invalid email address').optional(),
        contactNo: z.string().optional(),
        profile: profileUpdateSchema.optional(),
    }).strict(),
});

export const replaceClassTeacherSchema = z.object({
    body: z.object({
        standard: z.string().min(1, 'Standard is required'),
        section: z.string().min(1, 'Section is required'),
        replacementTeacherId: objectIdSchema,
        mode: z.enum(['replace', 'swap', 'reassign']).optional().default('replace'),
        reassignTeacherId: objectIdSchema.optional(),
    }).strict().superRefine((data, ctx) => {
        if (data.mode === 'reassign' && !data.reassignTeacherId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'reassignTeacherId is required when mode is reassign',
                path: ['reassignTeacherId'],
            });
        }
    }),
});

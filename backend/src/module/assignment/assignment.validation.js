import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
const dueDateSchema = z.string().refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    { message: "dueDate must be a valid date or ISO datetime" }
).refine(
    (value) => {
        const d = new Date(value.includes('T') ? value : value + 'T00:00:00');
        return d.getDay() !== 0;
    },
    { message: "Sundays are not allowed." }
);
const parseSectionList = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            return [trimmed];
        }

        return [trimmed];
    }

    return value;
};

const sectionListSchema = z.preprocess(
    parseSectionList,
    z.array(z.string().min(1, "Section cannot be empty")).optional()
);

// Assignment Validation Schemas

// Create Assignment — body is multipart/form-data so string fields come as strings
export const createAssignmentSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }).min(1, "Title cannot be empty").max(200),
        description: z.string().max(2000).optional().default(""),
        subject: z.string({ required_error: "Subject is required" }).min(1, "Subject cannot be empty").max(100),
        standard: z.string({ required_error: "Standard is required" }).min(1),
        section: z.string().min(1).optional(),
        sections: sectionListSchema,
        dueDate: dueDateSchema,
        assignedTeacher: objectIdSchema.optional(),
    }).superRefine((data, ctx) => {
        const hasSingleSection = Boolean(String(data.section || "").trim());
        const hasSectionList = Array.isArray(data.sections) && data.sections.length > 0;

        if (!hasSingleSection && !hasSectionList) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "At least one section is required",
                path: ["sections"],
            });
        }
    }),
});

// Update Assignment — all fields optional
export const updateAssignmentSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        dueDate: dueDateSchema.optional(),
        assignedTeacher: objectIdSchema.optional(),
        status: z.enum(["active", "closed"]).optional(),
    }),
    params: z.object({
        id: objectIdSchema,
    }),
});

// Assignment ID param
export const assignmentIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

// Submission Validation Schemas
// Submit Assignment — files handled by multer, only need assignment ID
export const submitAssignmentSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

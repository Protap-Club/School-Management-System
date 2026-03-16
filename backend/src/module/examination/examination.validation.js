import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

// Time format: HH:MM (24-hour)
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)").optional();

// ═══════════════════════════════════════════════════════════════
// Schedule item (used inside create/update body)
// ═══════════════════════════════════════════════════════════════

const scheduleItemSchema = z.object({
    subject: z.string({ required_error: "Subject is required" }).nonempty().max(100),
    examDate: z.string({ required_error: "Exam date is required" }).datetime({ offset: true }).or(z.string().date()),
    startTime: timeSchema,
    endTime: timeSchema,
    totalMarks: z.number({ required_error: "Total marks is required" }).int().min(1),
    passingMarks: z.number().int().min(0).optional().default(0),
    assignedTeacher: objectIdSchema.optional(),
    syllabus: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════════════════════════
// Create Exam
// ═══════════════════════════════════════════════════════════════

export const createExamSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Exam name is required" }).nonempty().max(150),
        examType: z.enum(["TERM_EXAM", "CLASS_TEST"], { required_error: "Exam type is required" }),
        category: z
            .enum(["MIDTERM", "FINAL", "SEMESTER", "UNIT_TEST", "CLASS_TEST", "SURPRISE_TEST", "WEEKLY_QUIZ", "OTHER"])
            .optional()
            .default("OTHER"),
        categoryDescription: z.string().max(200).optional(),
        academicYear: z.number({ required_error: "Academic year is required" }).int().min(2000).max(2100),
        standard: z.string({ required_error: "Standard is required" }).nonempty(),
        section: z.string({ required_error: "Section is required" }).nonempty(),
        description: z.string().max(500).optional(),
        schedule: z.array(scheduleItemSchema).optional().default([]),
        schoolId: objectIdSchema.optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Update Exam
// ═══════════════════════════════════════════════════════════════

export const updateExamSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().nonempty().max(150).optional(),
        category: z
            .enum(["MIDTERM", "FINAL", "SEMESTER", "UNIT_TEST", "CLASS_TEST", "SURPRISE_TEST", "WEEKLY_QUIZ", "OTHER"])
            .optional(),
        categoryDescription: z.string().max(200).optional(),
        description: z.string().max(500).optional(),
        schedule: z.array(scheduleItemSchema).optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
        examType: z.enum(["TERM_EXAM", "CLASS_TEST"]).optional(),
        standard: z.string().optional(),
        section: z.string().optional(),
        academicYear: z.number().optional(),
        schoolId: objectIdSchema.optional(),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Get Exams (list)
// ═══════════════════════════════════════════════════════════════

export const getExamsQuerySchema = z.object({
    query: z
        .object({
            examType: z.enum(["TERM_EXAM", "CLASS_TEST"]).optional(),
            academicYear: z
                .union([z.string(), z.number()])
                .optional()
                .transform((val) => (val ? Number(val) : undefined)),
            standard: z.string().optional(),
            section: z.string().optional(),
            status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
        })
        .optional(),
});

// ═══════════════════════════════════════════════════════════════
// Common param schemas
// ═══════════════════════════════════════════════════════════════

export const examIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

// ═══════════════════════════════════════════════════════════════
// Update Status
// ═══════════════════════════════════════════════════════════════

export const updateStatusSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        status: z.enum(["PUBLISHED", "COMPLETED", "CANCELLED"], {
            required_error: "Status is required",
        }),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Student — My Exams
// ═══════════════════════════════════════════════════════════════

export const myExamsQuerySchema = z.object({
    query: z
        .object({
            academicYear: z
                .union([z.string(), z.number()])
                .optional()
                .transform((val) => (val ? Number(val) : undefined)),
        })
        .optional(),
});

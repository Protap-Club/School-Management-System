import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const subjectMarksSchema = z.object({
    subject: z.string({ required_error: "Subject is required" }).nonempty().max(100),
    maxMarks: z.number().min(0).optional(),
    obtainedMarks: z.number({ required_error: "Obtained marks is required" }).min(0),
});

export const saveResultSchema = z.object({
    body: z.object({
        examId: objectIdSchema,
        studentId: objectIdSchema,
        subjects: z.array(subjectMarksSchema).min(1, "At least one subject is required"),
    }),
});

export const examIdParamsSchema = z.object({
    params: z.object({
        examId: objectIdSchema,
    }),
});

export const myResultsQuerySchema = z.object({
    query: z
        .object({
            examId: objectIdSchema.optional(),
        })
        .optional(),
});

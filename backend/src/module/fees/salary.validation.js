import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

// ── Create Salary Entry ────────────────────────────────────────
export const createSalarySchema = z.object({
    body: z.object({
        teacherId: objectIdSchema,
        month: z.coerce.number().int().min(1).max(12),
        year: z.coerce.number().int().min(2000).max(2100),
        amount: z.coerce.number().min(0, "Amount cannot be negative"),
        remarks: z.string().optional(),
    }),
});

// ── Get Salary Entries (query params) ──────────────────────────
export const getSalaryEntriesSchema = z.object({
    query: z.object({
        teacherId: objectIdSchema.optional(),
        year: z.coerce.number().int().optional(),
        month: z.coerce.number().int().min(1).max(12).optional(),
        status: z.enum(["PENDING", "PAID"]).optional(),
    }),
});

// ── Get Teacher's Own Salary ───────────────────────────────────
export const getTeacherSalarySchema = z.object({
    query: z.object({
        year: z.coerce.number().int().optional(),
    }),
});

// ── Update Salary Status ───────────────────────────────────────
export const updateSalaryStatusSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        status: z.enum(["PAID"]),
        paidDate: z.string().optional(),
        remarks: z.string().optional(),
    }),
});

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

// ═══════════════════════════════════════════════════════════════
// Fee Structure Schemas
// ═══════════════════════════════════════════════════════════════

export const createFeeStructureSchema = z.object({
    body: z.object({
        academicYear: z.number({ required_error: "Academic year is required" }).int().min(2000).max(2100),
        standard: z.string({ required_error: "Standard is required" }).nonempty(),
        section: z.string({ required_error: "Section is required" }).nonempty(),
        feeType: z.string({ required_error: "Fee type is required" }).nonempty(),
        name: z.string({ required_error: "Fee name is required" }).nonempty().max(100),
        amount: z.number({ required_error: "Amount is required" }).min(0),
        frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"], {
            required_error: "Frequency is required",
        }),
        dueDay: z.number().int().min(1).max(28).optional().default(10),
        applicableMonths: z.array(z.number().int().min(1).max(12)).optional().default([]),
    }),
});

export const updateFeeStructureSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().nonempty().max(100).optional(),
        amount: z.number().min(0).optional(),
        frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]).optional(),
        dueDay: z.number().int().min(1).max(28).optional(),
        applicableMonths: z.array(z.number().int().min(1).max(12)).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const feeStructureIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

export const getFeeStructuresQuerySchema = z.object({
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).optional().transform((val) => (val ? Number(val) : undefined)),
        standard: z.string().optional(),
        section: z.string().optional(),
        feeType: z.string().optional(),
        isActive: z.string().optional(),
    }).optional(),
});

// ═══════════════════════════════════════════════════════════════
// Assignment Schemas
// ═══════════════════════════════════════════════════════════════

export const generateAssignmentsSchema = z.object({
    params: z.object({
        id: objectIdSchema, // feeStructureId
    }),
    body: z.object({
        month: z.number({ required_error: "Month is required" }).int().min(1).max(12),
        year: z.number({ required_error: "Year is required" }).int().min(2000).max(2100),
    }),
});

export const updateAssignmentSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        discount: z.number().min(0).optional(),
        remarks: z.string().max(500).optional(),
        status: z.enum(["WAIVED"]).optional(), // Only WAIVED can be set manually
    }),
});

// ═══════════════════════════════════════════════════════════════
// Payment Schemas
// ═══════════════════════════════════════════════════════════════

export const recordPaymentSchema = z.object({
    params: z.object({
        id: objectIdSchema, // feeAssignmentId
    }),
    body: z.object({
        amount: z.number({ required_error: "Payment amount is required" }).min(1),
        paymentMode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE"], {
            required_error: "Payment mode is required",
        }),
        paymentDate: z.string().datetime().optional(),
        transactionRef: z.string().max(100).optional(),
        remarks: z.string().max(500).optional(),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Dashboard & Report Schemas
// ═══════════════════════════════════════════════════════════════

export const classOverviewSchema = z.object({
    params: z.object({
        standard: z.string({ required_error: "Standard is required" }).nonempty(),
        section: z.string({ required_error: "Section is required" }).nonempty(),
    }),
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        month: z.union([z.string(), z.number()]).transform((val) => Number(val)),
    }),
});

export const allClassesOverviewSchema = z.object({
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        month: z.union([z.string(), z.number()]).transform((val) => Number(val)),
    }),
});

export const yearlySummarySchema = z.object({
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).transform((val) => Number(val)),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Student & Teacher View Schemas
// ═══════════════════════════════════════════════════════════════

export const studentFeeHistorySchema = z.object({
    params: z.object({
        studentId: objectIdSchema,
    }),
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).optional().transform((val) => (val ? Number(val) : undefined)),
    }).optional(),
});

export const myClassFeesSchema = z.object({
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).transform((val) => Number(val)),
        month: z.union([z.string(), z.number()]).transform((val) => Number(val)),
    }),
});

export const myFeesSchema = z.object({
    query: z.object({
        academicYear: z.union([z.string(), z.number()]).optional().transform((val) => (val ? Number(val) : undefined)),
        month: z.union([z.string(), z.number()]).optional().transform((val) => (val ? Number(val) : undefined)),
        detailed: z.string().optional(),
    }).optional(),
});

// ═══════════════════════════════════════════════════════════════
// Fee Type Schemas
// ═══════════════════════════════════════════════════════════════

export const createFeeTypeSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Name is required" }).nonempty().uppercase(),
        label: z.string({ required_error: "Label is required" }).nonempty(),
    }),
});

export const updateFeeTypeSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        label: z.string().nonempty().optional(),
        isActive: z.boolean().optional(),
    }),
});

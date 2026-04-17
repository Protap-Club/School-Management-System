import { z } from "zod";

const objectIdSchema = z.string();

// ═══════════════════════════════════════════════════════════════
// Fee Structure Schemas
// ═══════════════════════════════════════════════════════════════

export const createFeeStructureSchema = z.object({
    body: z.object({
        academicYear: z.coerce.number({ required_error: "Academic year is required" }).int().min(2000).max(2100),
        standard: z.preprocess(
            (val) => (Array.isArray(val) ? val.map(String) : String(val)),
            z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
        ),
        section: z.preprocess(
            (val) => (Array.isArray(val) ? val.map(String) : String(val)),
            z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
        ),
        feeType: z.coerce.string().min(1),
        name: z.coerce.string().min(1).max(100),
        amount: z.coerce.number({ required_error: "Amount is required" }).min(0),
        frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "ONE_TIME"], {
            required_error: "Frequency is required",
        }),
        dueDay: z.coerce.number().int().min(1).max(28).optional().default(10),
        applicableMonths: z.array(z.coerce.number().int().min(1).max(12), { required_error: "At least one month must be selected" }).min(1, "At least one month must be selected"),
    }).superRefine((data, ctx) => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // 1. Current Month Based Behavior: Past months disallowed
        if (Array.isArray(data.applicableMonths)) {
            const ACADEMIC_YEAR_START_MONTH = 6;
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            const isPast = data.applicableMonths.some(m => {
                // Determine the actual calendar year for this month within the academic session
                // Session 2025 starts June 2025 and ends May 2026
                const targetCalendarYear = m < ACADEMIC_YEAR_START_MONTH ? data.academicYear + 1 : data.academicYear;
                
                if (targetCalendarYear < currentYear) return true;
                if (targetCalendarYear === currentYear && m < currentMonth) return true;
                return false;
            });

            if (isPast) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Selection includes past months. Fees can only be created for the current month (${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}) or future.`,
                    path: ["applicableMonths"],
                });
            }
        }

        // 2. Quarterly Logic: Every 3rd Month starting from Current Month
        if (data.frequency === 'QUARTERLY' && Array.isArray(data.applicableMonths) && data.applicableMonths.length > 0) {
            const baseMonth = currentMonth;
            const invalidMonths = data.applicableMonths.filter(m => {
                const diff = (m - baseMonth + 12) % 12;
                return diff % 3 !== 0;
            });

            if (invalidMonths.length > 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `For Quarterly frequency, only every 3rd month from the current month (${baseMonth}) is allowed.`,
                    path: ["applicableMonths"],
                });
            }
        }

        // 3. Half-Yearly Logic: Manual selection of exactly 6 months
        if (data.frequency === 'HALF_YEARLY' && Array.isArray(data.applicableMonths)) {
            if (data.applicableMonths.length !== 6) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `For Half-Yearly frequency, you must select exactly 6 months manually.`,
                    path: ["applicableMonths"],
                });
            }
        }
    }),
});

export const updateFeeStructureSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        name: z.string().nonempty().max(100).optional(),
        amount: z.number().min(0).optional(),
        frequency: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "ONE_TIME"]).optional(),
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

export const createPenaltyTypeSchema = createFeeTypeSchema;

export const updateFeeTypeSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
    body: z.object({
        label: z.string().nonempty().optional(),
        isActive: z.boolean().optional(),
    }),
});

// ═══════════════════════════════════════════════════════════════
// Student Penalty Schemas
// ═══════════════════════════════════════════════════════════════

export const createStudentPenaltySchema = z.object({
    body: z.object({
        studentId: z.string({ required_error: "Student is required" }).min(1),
        academicYear: z.coerce.number().int().min(2000).max(2100),
        standard: z.string().min(1),
        section: z.string().min(1),
        penaltyType: z.string({ required_error: "Penalty type is required" }).min(1),
        reason: z.string({ required_error: "Reason is required" }).min(1).max(500),
        amount: z.coerce.number({ required_error: "Amount is required" }).min(0),
        occurrenceDate: z.string({ required_error: "Occurrence date is required" }),
    }),
});

export const getStudentsByClassSchema = z.object({
    query: z.object({
        standard: z.string({ required_error: "Standard is required" }).min(1),
        section: z.string({ required_error: "Section is required" }).min(1),
    }),
});

export const getPenaltyStudentsByClassSchema = z.object({
    query: z.object({
        academicYear: z.coerce.number().int().min(2000).max(2100).optional(),
        standard: z.string({ required_error: "Standard is required" }).min(1),
        section: z.string({ required_error: "Section is required" }).min(1),
    }),
});

export const getStudentPenaltiesSchema = z.object({
    query: z.object({
        academicYear: z.coerce.number().int().min(2000).max(2100).optional(),
        standard: z.string().min(1).optional(),
        section: z.string().min(1).optional(),
        studentId: z.string().min(1).optional(),
    }),
});

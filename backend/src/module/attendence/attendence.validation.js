import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const linkTagSchema = z.object({
    body: z.object({
        studentId: z.string().nonempty({ message: "Student ID is required" }),
        nfcUid: z.string().nonempty({ message: "NFC UID is required" }),
    }),
});

export const markAttendanceSchema = z.object({
    body: z.object({
        nfcUid: z.string().min(1, "NFC UID is required"),
    }),
});

export const manualAttendanceSchema = z.object({
    body: z.object({
        studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid student ID"),
        status: z.enum(["Present", "Absent"]),
    }),
});

export const studentIdParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
    }),
});

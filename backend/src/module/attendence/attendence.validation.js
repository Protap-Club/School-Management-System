import { z } from 'zod';

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

import { z } from 'zod';

export const linkTagSchema = z.object({
    body: z.object({
        studentId: z.string().nonempty({ message: "Student ID is required" }),
        nfcUid: z.string().nonempty({ message: "NFC UID is required" }),
    }),
});

export const markAttendanceSchema = z.object({
    body: z.object({
        nfcUid: z.string().nonempty({ message: "NFC UID is required" }),
    }).optional(),
    query: z.object({
        nfcUid: z.string().nonempty({ message: "NFC UID is required" }),
    }).optional(),
}).refine(data => data.body?.nfcUid || data.query?.nfcUid, {
    message: "NFC UID must be provided in either body or query",
    path: ["nfcUid"],
});

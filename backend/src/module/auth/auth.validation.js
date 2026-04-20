import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
    }),
});

export const updatePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(1, { message: "Current password is required" }),
        newPassword: z.string().min(8, { message: "New password must be at least 8 characters long" }),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        method: z.enum(['link', 'otp'], { message: "Method must be 'link' or 'otp'" }).optional(),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, { message: "Reset token is required" }),
        newPassword: z.string().min(8, { message: "New password must be at least 8 characters long" }),
    }),
});

export const resetPasswordWithOtpSchema = z.object({
    body: z.object({
        email: z.string().email({ message: "Invalid email address" }),
        otp: z.string().regex(/^\d{6}$/, { message: "OTP must be a 6-digit code" }),
        newPassword: z.string().min(8, { message: "New password must be at least 8 characters long" }),
    }),
});

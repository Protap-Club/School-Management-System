import express from "express";
import rateLimit from "express-rate-limit";
import {
    login,
    refresh,
    logout,
    checkAuthStatus,
    updatePassword,
    forgotPassword,
    resetPassword,
    resetPasswordWithOtp
} from "./auth.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    loginSchema,
    updatePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    resetPasswordWithOtpSchema
} from "./auth.validation.js";
import { conf } from "../../config/index.js";

const router = express.Router();
export const getAuthRateLimitMax = (nodeEnv = conf.NODE_ENV) => {
    const prod = nodeEnv === "production";
    return {
        login: prod ? 20 : 100,
        refresh: prod ? 30 : 300,
    };
};
const rateLimitMax = getAuthRateLimitMax(conf.NODE_ENV);

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: rateLimitMax.login,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: rateLimitMax.refresh,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: "Too many refresh requests. Please try again later." },
});

const passwordUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many password update attempts. Please try again later." },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many password reset attempts. Please try again later." },
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many password reset attempts. Please try again later." },
});

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/me", checkAuth, checkAuthStatus);
router.post("/update-password", checkAuth, passwordUpdateLimiter, validate(updatePasswordSchema), updatePassword);
router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/reset-password-otp", resetPasswordLimiter, validate(resetPasswordWithOtpSchema), resetPasswordWithOtp);

export default router;

import express from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, logout, checkAuthStatus } from "./auth.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { loginSchema } from "./auth.validation.js";

const router = express.Router();

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many refresh requests. Please try again later." },
});

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/me", checkAuth, checkAuthStatus);

export default router;

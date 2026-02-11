import express from "express";
import { login, refresh, logout, checkAuthStatus } from "./auth.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { loginSchema } from "./auth.validation.js";

const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), login);

// POST /api/v1/auth/refresh  — no auth middleware, uses HttpOnly cookie
router.post("/refresh", refresh);

// POST /api/v1/auth/logout   — no auth middleware, uses HttpOnly cookie
router.post("/logout", logout);

// GET /api/v1/auth/me
router.get("/me", checkAuth, checkAuthStatus);

export default router;

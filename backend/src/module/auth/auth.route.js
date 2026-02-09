import express from "express";
import { login, checkAuthStatus } from "./auth.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { loginSchema } from "./auth.validation.js";

const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), login);

// GET /api/v1/auth/me
router.get("/me", checkAuth, checkAuthStatus);

export default router;

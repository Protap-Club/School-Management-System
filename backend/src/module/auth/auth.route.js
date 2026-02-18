import express from "express";
import { login, refresh, logout, checkAuthStatus } from "./auth.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { loginSchema } from "./auth.validation.js";

const router = express.Router();

router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", checkAuth, checkAuthStatus);

export default router;

import express from "express";
import { login, checkAuthStatus } from "../controllers/auth.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { loginSchema } from "../validations/auth.validation.js";

const router = express.Router();

router.post("/login", validate(loginSchema), login);
router.get("/check", checkAuth, checkAuthStatus);

export default router;

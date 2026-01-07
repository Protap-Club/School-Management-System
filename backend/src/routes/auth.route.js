import express from "express";
import { login, checkAuthStatus } from "../controllers/auth.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/check", checkAuth, checkAuthStatus);

export default router;

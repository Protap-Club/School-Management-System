import express from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// GET /api/v1/settings - Public (for theme/logo on login page)
router.get("/", getSettings);

// PUT /api/v1/settings - Protected (Admin/SuperAdmin only)
router.put(
    "/",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    updateSettings
);

export default router;

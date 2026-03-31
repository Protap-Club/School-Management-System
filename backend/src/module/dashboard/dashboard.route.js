import express from "express";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { getDashboardStats } from "./dashboard.controller.js";
import { USER_ROLES } from "../../constants/userRoles.js";

const router = express.Router();

// Both admins and teachers need stats
router.use(checkAuth);
router.use(checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]));

router.get("/stats", getDashboardStats);

export default router;

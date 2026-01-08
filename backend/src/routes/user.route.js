import express from "express";
import { createUser, getUsers, getUsersWithProfiles } from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// POST /api/v1/user/create-user
// Protected: Only roles with permission (mapped in controller) can create
router.post("/create-user", checkAuth, createUser);

// GET /api/v1/user/get-users
// Restricted: Only Super Admin, Admin, and Teacher
router.get("/get-users", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsers);

// GET /api/v1/user/get-users-with-profiles
// Get users with their profile data (Roll Number, Course, Department, etc.)
router.get("/get-users-with-profiles", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsersWithProfiles);

export default router;

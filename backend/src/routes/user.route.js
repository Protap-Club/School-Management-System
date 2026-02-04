import express from "express";
import {
    createUser,
    getUsers,
    toggleUserStatus,
    hardDeleteUsers
} from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createUserSchema,
    getUsersSchema,
    userIdsBodySchema
} from "../validations/user.validation.js";

const router = express.Router();

// Base Middleware
router.use(checkAuth);

// GET /api/v1/users - List users
router.get("/", validate(getUsersSchema), getUsers);

// POST /api/v1/users - Create user
router.post(
    "/", 
    // checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), // Assuming RBAC needed? User didn't specify but implies "Principals only"
    validate(createUserSchema), 
    createUser
);

// PATCH /api/v1/users/archive - Bulk archive
router.patch(
    "/archive", 
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), 
    validate(userIdsBodySchema), 
    toggleUserStatus
);

// DELETE /api/v1/users - Bulk hard delete
router.delete(
    "/", 
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), 
    validate(userIdsBodySchema), 
    hardDeleteUsers
);

export default router;

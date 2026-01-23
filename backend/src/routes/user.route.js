import express from "express";
import {
    createUser,
    getUsers,
    getUsersWithProfiles,
    archiveUser,
    archiveUsers,
    deleteUser,
    deleteUsers,
    restoreUser,
    restoreUsers, // Imported the new restoreUsers controller
    getArchivedUsers
} from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createUserSchema,
    getUsersSchema,
    userIdParamsSchema,
    userIdsBodySchema
} from "../validations/user.validation.js";

const router = express.Router();

// User CRUD
router.post("/", checkAuth, validate(createUserSchema), createUser);
router.get("/", checkAuth, validate(getUsersSchema), getUsers);
router.get("/with-profiles", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsersWithProfiles);

// Archive (Soft Delete)
router.put("/archive/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdParamsSchema), archiveUser);
router.put("/archive-bulk", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdsBodySchema), archiveUsers);

// Delete (Hard Delete - only archived users)
router.delete("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdParamsSchema), deleteUser);
router.delete("/bulk", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdsBodySchema), deleteUsers);

// Restore
router.put("/restore/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdParamsSchema), restoreUser);
router.put("/restore-bulk", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(userIdsBodySchema), restoreUsers); // New route for bulk restore

// Get Archived Users
router.get("/archived", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(getUsersSchema), getArchivedUsers);

export default router;

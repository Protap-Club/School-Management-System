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
    getArchivedUsers
} from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// User CRUD
router.post("/create-user", checkAuth, createUser);
router.get("/get-users", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsers);
router.get("/get-users-with-profiles", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsersWithProfiles);

// Archive (Soft Delete)
router.put("/archive/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), archiveUser);
router.put("/archive-bulk", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), archiveUsers);

// Delete (Hard Delete - only archived users)
router.delete("/delete/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), deleteUser);
router.delete("/delete-bulk", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), deleteUsers);

// Restore
router.put("/restore/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), restoreUser);

// Get Archived Users
router.get("/archived", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getArchivedUsers);

export default router;

import express from "express";
import { createUser, getUsers, getUsersWithProfiles } from "../controllers/user.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

router.post("/create-user", checkAuth, createUser);
router.get("/get-users", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsers);
router.get("/get-users-with-profiles", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), getUsersWithProfiles);

export default router;

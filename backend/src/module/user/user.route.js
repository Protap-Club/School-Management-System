import express from "express";
import { createUser, getUsers, getUserById, toggleUserStatus, hardDeleteUser, batchDeleteUsers, userProfile } from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createUserSchema, getUsersSchema, userIdParamsSchema, userIdsBodySchema, getProfileSchema } from "./user.validation.js";

const router = express.Router();

router.get('/profile', checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(getProfileSchema), userProfile);
router.get("/", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(getUsersSchema), getUsers);
router.get("/:id", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(userIdParamsSchema), getUserById);
router.post("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createUserSchema), createUser);
router.patch("/status", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(userIdsBodySchema), toggleUserStatus);
router.delete("/:id", checkRole([USER_ROLES.ADMIN]), validate(userIdParamsSchema), hardDeleteUser);
router.post("/batch-delete", checkRole([USER_ROLES.ADMIN]), validate(userIdsBodySchema), batchDeleteUsers);

export default router;

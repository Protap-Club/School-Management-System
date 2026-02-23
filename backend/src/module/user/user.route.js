import express from "express";
import { createUser, getUsers, toggleUserStatus, hardDeleteUsers, userProfile } from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createUserSchema, getUsersSchema, userIdsBodySchema, getProfileSchema } from "./user.validation.js";

const router = express.Router();

router.get('/profile', checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT]), validate(getProfileSchema), userProfile);
router.get("/", validate(getUsersSchema), getUsers);
router.get("/:id", getUsers);
router.post("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createUserSchema), createUser);
router.patch("/status", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(userIdsBodySchema), toggleUserStatus);
router.delete("/", checkRole([USER_ROLES.ADMIN]), validate(userIdsBodySchema), hardDeleteUsers);

export default router;

import express from "express";
import { createUser, getUsers, toggleUserStatus, hardDeleteUsers, uploadAvatar } from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createUserSchema, getUsersSchema, userIdsBodySchema } from "./user.validation.js";
import { avatarUpload } from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", validate(getUsersSchema), getUsers);
router.get("/:id", getUsers);
router.post("/", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createUserSchema), createUser);
router.patch("/status", checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(userIdsBodySchema), toggleUserStatus);
router.patch("/avatar", avatarUpload.single("avatar"), uploadAvatar);
router.delete("/", checkRole([USER_ROLES.ADMIN]), validate(userIdsBodySchema), hardDeleteUsers);

export default router;

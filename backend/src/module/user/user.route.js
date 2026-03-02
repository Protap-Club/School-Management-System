import express from "express";
import { getMyProfile, toggleUserStatus, hardDeleteUsers } from "./user.controller.js";
import { createUser, getUsers, toggleUserStatus, hardDeleteUsers, uploadAvatar } from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createUserSchema, getUsersSchema, userIdsBodySchema } from "./user.validation.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { avatarUpload } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// Mobile-accessible: own profile
router.get("/me/profile", getMyProfile);

// Web-only: user management

router.get("/", checkWebOnly,validate(getUsersSchema), getUsers);
router.get("/:id", checkWebOnly,getUsers);
router.post("/", checkWebOnly,checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(createUserSchema), createUser);
router.patch("/status", checkWebOnly,checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(userIdsBodySchema), toggleUserStatus);
router.patch("/avatar", checkWebOnly,avatarUpload.single("avatar"), uploadAvatar);
router.delete("/", checkWebOnly,checkRole([USER_ROLES.ADMIN]), validate(userIdsBodySchema), hardDeleteUsers);

export default router;

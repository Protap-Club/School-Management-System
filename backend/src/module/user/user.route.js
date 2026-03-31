import express from "express";
import {
    getMyProfile,
    createUser,
    getUsers,
    getUserById,
    toggleArchive,
    uploadAvatar,
    updateUser,
    updateTeacherProfile,
    replaceClassTeacher,
} from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createUserSchema,
    getUsersSchema,
    userIdsBodySchema,
    userIdParamsSchema,
    updateTeacherProfileSchema,
    updateUserSchema,
    replaceClassTeacherSchema,
} from "./user.validation.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { avatarUpload } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// Mobile + Web: Own Profile
router.get("/me/profile", getMyProfile);

// Web Only: User Management
router.get(
    "/",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(getUsersSchema),
    getUsers
);

router.get(
    "/:id",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(userIdParamsSchema),
    getUserById
);

router.post(
    "/",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(createUserSchema),
    createUser
);

router.patch(
    "/archive",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(userIdsBodySchema),
    toggleArchive
);

router.patch("/me/avatar", checkWebOnly, avatarUpload.single("avatar"), uploadAvatar);

router.patch(
    "/class-teacher/replace",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(replaceClassTeacherSchema),
    replaceClassTeacher
);

router.patch(
    "/:id/teacher-profile",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(updateTeacherProfileSchema),
    updateTeacherProfile
);

router.patch(
    "/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(updateUserSchema),
    updateUser
);

export default router;

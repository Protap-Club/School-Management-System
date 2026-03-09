import express from "express";
import {
    getMyProfile,
    createUser,
    getUsers,
    getUserById,
    toggleArchive,
    uploadAvatar,
    // batchDeleteUsers,  // Uncomment when hard delete is enabled
} from "./user.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { createUserSchema, getUsersSchema, userIdsBodySchema, userIdParamsSchema } from "./user.validation.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { avatarUpload } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// ─── Mobile + Web: Own Profile ──────────────────────────────────────
router.get("/me/profile", getMyProfile);

// ─── Web Only: User Management ──────────────────────────────────────

// List all users (scoped by role & school)
router.get("/", checkWebOnly, validate(getUsersSchema), getUsers);

// Get a single user by ID
router.get("/:id", checkWebOnly, validate(userIdParamsSchema), getUserById);

// Create a new user (admin/super_admin: any lower role, teacher: student only)
router.post(
    "/",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(createUserSchema),
    createUser
);

// Archive / Restore users (soft delete toggle)
router.patch(
    "/archive",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(userIdsBodySchema),
    toggleArchive
);

// Upload own avatar
router.patch("/me/avatar", checkWebOnly, avatarUpload.single("avatar"), uploadAvatar);

// ─── Hard Delete (commented out — not in scope yet) ─────────────────
// Uncomment when permanent deletion is approved and tested.
// router.delete(
//     "/",
//     checkWebOnly,
//     checkRole([USER_ROLES.ADMIN]),
//     validate(userIdsBodySchema),
//     batchDeleteUsers
// );

export default router;

import express from "express";
import {
    createUser,
    getUsers,
    toggleUserStatus,
} from "./user.controller.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createUserSchema,
    getUsersSchema,
    userIdsBodySchema
} from "./user.validation.js";

const router = express.Router();

router.get("/", validate(getUsersSchema), getUsers);  // all authenticated can see users
router.get("/:id", validate(getUsersSchema), getUsers);  // returns single user for profile
router.post("/", validate(createUserSchema), createUser);  // create bulk user
router.post("/:id", validate(createUserSchema), createUser) // create single user
router.patch("/", validate(userIdsBodySchema), toggleUserStatus) // archive many users
router.patch("/:id", validate(userIdsBodySchema), toggleUserStatus) // archive single user

export default router;

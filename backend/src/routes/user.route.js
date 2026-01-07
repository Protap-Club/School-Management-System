import Router from "express";
import { createUser, getUsers } from "../controller/user.controller.js";

const router = Router();

// POST /api/v1/user/create-user
router.post("/user/create-user", createUser);

// GET /api/v1/user/get-users
router.get("/user/get-users", getUsers);

export default router;

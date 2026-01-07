import Router from "express";
import { createUser, getUsers } from "../controller/user.controller.js";

const router = Router();

// TEMPORARY: Mock auth middleware for testing (REMOVE IN PRODUCTION)
const mockAuth = (req, res, next) => {
    req.user = {
        _id: "507f1f77bcf86cd799439011",
        role: "student", // Change to "admin" or "teacher" to test permissions
        name: "Test Super Admin"
    };
    next();
};

// POST /api/v1/user/create-user
router.post("/user/create-user", mockAuth, createUser);

// GET /api/v1/user/get-users
router.get("/user/get-users", mockAuth, getUsers);

export default router;

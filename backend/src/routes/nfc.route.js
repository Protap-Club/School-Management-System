import express from "express";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { linkTag, markAttendance } from "../controllers/nfc.controller.js";

const router = express.Router();

// Link NFC tag to student (Admin/Teacher only)
router.post(
    "/link",
    checkAuth,
    checkRole(["super_admin", "admin", "teacher"]),
    linkTag
);

// Mark attendance via NFC scan
router.post(
    "/attendance",
    checkAuth,
    markAttendance
);

export default router;

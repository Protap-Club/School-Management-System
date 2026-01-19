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
// Supports both: authenticated users OR device key for NFC readers
router.post(
    "/attendance",
    (req, res, next) => {
        // Check for device key (for NFC reader devices)
        const deviceKey = req.headers['x-device-key'];
        if (deviceKey === 'NFC-DEVICE-2026') {
            return next();
        }
        // Otherwise, check for user auth
        return checkAuth(req, res, next);
    },
    markAttendance
);

export default router;

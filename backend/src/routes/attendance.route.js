import express from "express";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { linkTag, markAttendance } from "../controllers/attendence.controller.js";
import { validate } from "../middlewares/validation.middleware.js";
import { linkTagSchema, markAttendanceSchema } from "../validations/nfc.validation.js";

const router = express.Router();

// Route: /api/v1/attendance

// Link NFC tag to student (Admin/Teacher only)
// POST /api/v1/attendance/nfc/link
router.post(
    "/nfc/link",
    checkAuth,
    checkRole(["super_admin", "admin", "teacher"]),
    validate(linkTagSchema),
    linkTag
);

// Mark attendance via NFC scan
// POST /api/v1/attendance/nfc
// Supports both: authenticated users OR device key for NFC readers
router.post(
    "/nfc",
    validate(markAttendanceSchema),
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

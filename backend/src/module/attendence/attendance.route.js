import express from "express";
import { linkTag, markAttendance, getTodayAttendance } from "./attendence.controller.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { linkTagSchema, markAttendanceSchema } from "./attendence.validation.js";

const router = express.Router();

// Route: /api/v1/attendance

router.get("/today",getTodayAttendance);  // Get today's Attendance
router.post("/nfc/link", validate(linkTagSchema), linkTag);  // Link user to perticular NFC tag
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

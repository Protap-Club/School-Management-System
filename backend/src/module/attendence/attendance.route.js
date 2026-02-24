import express from "express";
import { linkTag, markAttendance, getTodayAttendance } from "./attendence.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { linkTagSchema, markAttendanceSchema } from "./attendence.validation.js";

const router = express.Router();

router.get("/today", checkAuth, getTodayAttendance);
router.post("/nfc/link", checkAuth, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), validate(linkTagSchema), linkTag);
router.post(
    "/nfc",
    validate(markAttendanceSchema),
    (req, res, next) => {
        // Device auth: NFC readers bypass user auth
        const deviceKey = req.headers["x-device-key"];
        if (deviceKey === "NFC-DEVICE-2026") return next();
        return checkAuth(req, res, next);
    },
    markAttendance
);

export default router;

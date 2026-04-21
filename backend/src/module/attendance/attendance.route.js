import express from "express";
import { linkTag, markAttendance, getTodayAttendance, getStudentAttendanceById, markManual } from "./attendance.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { linkTagSchema, markAttendanceSchema, manualAttendanceSchema, studentIdParamsSchema } from "./attendance.validation.js";

const router = express.Router();

// Feature-gated user-facing routes (NFC hardware endpoint is intentionally excluded)
router.get("/today", checkAuth, requireFeature("attendance"), getTodayAttendance);
router.get("/:id", checkAuth, requireFeature("attendance"), validate(studentIdParamsSchema), getStudentAttendanceById);
router.post("/nfc/link", checkAuth, checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]), requireFeature("attendance"), validate(linkTagSchema), linkTag);

// NFC hardware endpoint — device-key auth, intentionally NOT gated by requireFeature
// so that physical NFC readers always work regardless of feature toggle state
router.post(
    "/nfc",
    validate(markAttendanceSchema),
    (req, res, next) => {
        const deviceKey = req.headers["x-device-key"];
        if (deviceKey && deviceKey === process.env.NFC_DEVICE_KEY) return next();
        return checkAuth(req, res, next);
    },
    markAttendance
);

// Manual attendance — teacher marks student present/absent from their assigned class
router.put(
    "/manual",
    checkAuth,
    checkRole([USER_ROLES.TEACHER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    requireFeature("attendance"),
    validate(manualAttendanceSchema),
    markManual
);

export default router;

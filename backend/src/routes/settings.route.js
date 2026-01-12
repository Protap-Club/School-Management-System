import express from "express";
import { getSettings, updateSettings, uploadLogo } from "../controllers/settings.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), updateSettings);
router.post("/upload-logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), upload.single('logo'), uploadLogo);

export default router;

import express from "express";
import {
    createSchool, getSchools, getSchoolById, updateSchool,
    deleteSchool, getSchoolsList, uploadSchoolLogo, deleteSchoolLogo,
    updateSchoolTheme, getMySchoolBranding,
    getSchoolFeatures, updateSchoolFeatures, toggleSchoolFeature, getAvailableFeatures
} from "../controllers/school.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// --- Specific routes MUST come before /:id routes ---

// Branding (for current user's school)
router.get("/my-branding", checkAuth, getMySchoolBranding);

// Logo Upload/Delete
router.post("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), upload.single('logo'), uploadSchoolLogo);
router.delete("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), deleteSchoolLogo);

// Theme Update
router.put("/theme", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), updateSchoolTheme);

// --- Schools CRUD (parameterized routes last) ---
router.get("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getSchools);
router.post("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), createSchool);
router.get("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getSchoolById);
router.put("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), updateSchool);
router.delete("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), deleteSchool);

// Available features list (for UI dropdowns)
router.get("/features/list", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), getAvailableFeatures);

// --- School Features (super_admin only) ---
router.get("/:id/features", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), getSchoolFeatures);
router.put("/:id/features", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), updateSchoolFeatures);
router.patch("/:id/features/:featureKey", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), toggleSchoolFeature);

export default router;

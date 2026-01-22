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
import extractSchoolId from "../middlewares/school.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createSchoolSchema, updateSchoolSchema, schoolIdParamsSchema,
    uploadLogoSchema, updateThemeSchema, updateFeaturesSchema, toggleFeatureSchema
} from "../validations/school.validation.js";

const router = express.Router();

// --- Generic Branding & Feature routes ---
router.get("/branding", checkAuth, extractSchoolId, getMySchoolBranding);

// Logo Upload/Delete
router.post("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(uploadLogoSchema), extractSchoolId, upload.single('logo'), uploadSchoolLogo);
router.delete("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), extractSchoolId, deleteSchoolLogo);

// Theme Update
router.put("/theme", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(updateThemeSchema), extractSchoolId, updateSchoolTheme);

// --- Schools CRUD (parameterized routes last) ---
router.get("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getSchools);
router.post("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(createSchoolSchema), createSchool);
router.get("/list", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), getSchoolsList);
router.get("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(schoolIdParamsSchema), extractSchoolId, getSchoolById);
router.put("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(updateSchoolSchema), extractSchoolId, updateSchool);
router.delete("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(schoolIdParamsSchema), extractSchoolId, deleteSchool);

// Available features list (for UI dropdowns)
router.get("/features/list", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), getAvailableFeatures);

// --- School Features (super_admin only) ---
router.get("/:id/features", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(schoolIdParamsSchema), extractSchoolId, getSchoolFeatures);
router.put("/:id/features", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(updateFeaturesSchema), extractSchoolId, updateSchoolFeatures);
router.patch("/:id/features/:featureKey", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), validate(toggleFeatureSchema), extractSchoolId, toggleSchoolFeature);

export default router;

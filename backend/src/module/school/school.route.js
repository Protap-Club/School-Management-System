import express from "express";
import {
    getSchoolById, // Mapped to getSchoolProfile
    updateSchool,
    uploadSchoolLogo,
    updateSchoolFeatures
} from "../controllers/school.controller.js";
import { checkAuth } from "../../middlewares/auth.middleware.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { upload } from "../../middlewares/upload.middleware.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    updateSchoolSchema,
    uploadLogoSchema,
    updateFeaturesSchema
} from "../../validations/school.validation.js";

const router = express.Router();

router.use(checkAuth);
router.use(extractSchoolId);

// Only Super Admin / Admin (Principal) can manage school settings
// router.use(checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN])); 
// Note: Some read ops might be open to teachers? adhering to "Principals only see their own staff" mostly.

// GET /api/v1/school/profile
router.get("/profile", getSchoolById);

// PUT /api/v1/school/profile
router.put(
    "/profile", 
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), 
    validate(updateSchoolSchema), 
    updateSchool
);

// PUT /api/v1/school/logo
router.put(
    "/logo", 
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), 
    upload.single('logo'), 
    validate(uploadLogoSchema), 
    uploadSchoolLogo
);

// PATCH /api/v1/school/features
router.patch(
    "/features", 
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), 
    validate(updateFeaturesSchema), 
    updateSchoolFeatures
);

export default router;

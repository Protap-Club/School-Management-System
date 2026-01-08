import express from "express";
import {
    createInstitute,
    getInstitutes,
    getInstituteById,
    updateInstitute,
    deleteInstitute,
    getInstitutesList,
    uploadInstituteLogo,
    updateInstituteFeatures,
    getMyInstituteBranding
} from "../controllers/institute.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// GET /api/v1/institute/list - Get simple list for dropdowns (SuperAdmin only)
router.get(
    "/list",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    getInstitutesList
);

// GET /api/v1/institute/my-branding - Get logged-in user's institute branding
router.get(
    "/my-branding",
    checkAuth,
    getMyInstituteBranding
);

// GET /api/v1/institute - Get all institutes
router.get(
    "/",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    getInstitutes
);

// GET /api/v1/institute/:id - Get single institute
router.get(
    "/:id",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    getInstituteById
);

// POST /api/v1/institute - Create institute (SuperAdmin only)
router.post(
    "/",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    createInstitute
);

// POST /api/v1/institute/:id/upload-logo - Upload institute logo
router.post(
    "/:id/upload-logo",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    upload.single('logo'),
    uploadInstituteLogo
);

// PUT /api/v1/institute/:id - Update institute (SuperAdmin only)
router.put(
    "/:id",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    updateInstitute
);

// PUT /api/v1/institute/:id/features - Update institute features
router.put(
    "/:id/features",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    updateInstituteFeatures
);

// DELETE /api/v1/institute/:id - Delete institute (SuperAdmin only)
router.delete(
    "/:id",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    deleteInstitute
);

export default router;


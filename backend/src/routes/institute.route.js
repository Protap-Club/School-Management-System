import express from "express";
import {
    createInstitute,
    getInstitutes,
    getInstituteById,
    updateInstitute,
    deleteInstitute,
    getInstitutesList
} from "../controllers/institute.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";

const router = express.Router();

// GET /api/v1/institute/list - Get simple list for dropdowns (SuperAdmin only)
router.get(
    "/list",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    getInstitutesList
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

// PUT /api/v1/institute/:id - Update institute (SuperAdmin only)
router.put(
    "/:id",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    updateInstitute
);

// DELETE /api/v1/institute/:id - Delete institute (SuperAdmin only)
router.delete(
    "/:id",
    checkAuth,
    checkRole([USER_ROLES.SUPER_ADMIN]),
    deleteInstitute
);

export default router;

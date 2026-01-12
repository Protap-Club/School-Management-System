import express from "express";
import {
    createInstitute, getInstitutes, getInstituteById, updateInstitute,
    deleteInstitute, getInstitutesList, uploadInstituteLogo, updateInstituteFeatures, getMyInstituteBranding
} from "../controllers/institute.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/list", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), getInstitutesList);
router.get("/my-branding", checkAuth, getMyInstituteBranding);
router.get("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getInstitutes);
router.get("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getInstituteById);
router.post("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), createInstitute);
router.post("/:id/upload-logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), upload.single('logo'), uploadInstituteLogo);
router.put("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), updateInstitute);
router.put("/:id/features", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), updateInstituteFeatures);
router.delete("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), deleteInstitute);

export default router;

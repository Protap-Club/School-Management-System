import express from "express";
import {
    createSchool, getSchools, getSchoolById, updateSchool,
    deleteSchool, getSchoolsList, uploadSchoolLogo, deleteSchoolLogo, getMySchoolBranding
} from "../controllers/school.controller.js";
import { checkAuth } from "../middlewares/auth.middleware.js";
import { checkRole } from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Branding
router.get("/my-branding", checkAuth, getMySchoolBranding);

// Schools CRUD
router.get("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getSchools);
router.get("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), getSchoolById);
router.post("/", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), createSchool);
router.put("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), updateSchool);
router.delete("/:id", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN]), deleteSchool);

// Logo Upload/Delete
router.post("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), upload.single('logo'), uploadSchoolLogo);
router.delete("/logo", checkAuth, checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), deleteSchoolLogo);

export default router;

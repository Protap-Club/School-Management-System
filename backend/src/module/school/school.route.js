import express from "express";
import { getSchoolById, updateSchool, uploadSchoolLogo, updateSchoolFeatures } from "./school.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { upload } from "../../middlewares/upload.middleware.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { updateSchoolSchema, uploadLogoSchema, updateFeaturesSchema } from "./school.validation.js";

const router = express.Router();

router.use(extractSchoolId);

router.get("/", getSchoolById);
router.put("/", checkRole([USER_ROLES.ADMIN]), validate(updateSchoolSchema), updateSchool);
router.post("/logo", checkRole([USER_ROLES.ADMIN]), upload.single("logo"), validate(uploadLogoSchema), uploadSchoolLogo);
router.get("/features", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), updateSchoolFeatures);
router.patch("/features", checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]), validate(updateFeaturesSchema), updateSchoolFeatures);

export default router;

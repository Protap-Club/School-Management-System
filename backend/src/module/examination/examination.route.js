import express from "express";
import {
    createExam,
    getExams,
    getExamById,
    updateExam,
    deleteExam,
    updateStatus,
    getMyExams,
} from "./examination.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createExamSchema,
    updateExamSchema,
    getExamsQuerySchema,
    examIdParamsSchema,
    updateStatusSchema,
    myExamsQuerySchema,
} from "./examination.validation.js";

const router = express.Router();

// Global middleware for all examination routes
router.use(extractSchoolId);
router.use(requireFeature("examination"));

// ── Student Route (mobile + web) ─────────────────────────────
router.get(
    "/my-exams",
    checkRole([USER_ROLES.STUDENT]),
    validate(myExamsQuerySchema),
    getMyExams
);

// ── Shared: List & View (mobile + web) ───────────────────────
router.get(
    "/",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(getExamsQuerySchema),
    getExams
);

router.get(
    "/:id",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    getExamById
);

// ── Admin + Teacher: Create / Update / Delete (web-only) ─────
router.post(
    "/",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(createExamSchema),
    createExam
);

router.put(
    "/:id",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(updateExamSchema),
    updateExam
);

router.delete(
    "/:id",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    deleteExam
);

router.patch(
    "/:id/status",
    checkWebOnly,
    checkRole([USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(updateStatusSchema),
    updateStatus
);

export default router;

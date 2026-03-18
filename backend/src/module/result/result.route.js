import express from "express";
import { checkRole } from "../../middlewares/role.middleware.js";
import extractSchoolId from "../../middlewares/school.middleware.js";
import { requireFeature } from "../../middlewares/feature.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import {
    getCompletedExams,
    getExamStudents,
    getExamResults,
    getMyResults,
    publishExamResults,
    saveResult,
} from "./result.controller.js";
import {
    examIdParamsSchema,
    myResultsQuerySchema,
    saveResultSchema,
} from "./result.validation.js";

const router = express.Router();

router.use(extractSchoolId);
router.use(requireFeature("examination"));

router.get(
    "/exams/completed",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    getCompletedExams
);

router.get(
    "/student/me",
    checkRole([USER_ROLES.STUDENT]),
    validate(myResultsQuerySchema),
    getMyResults
);

router.get(
    "/:examId/students",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    getExamStudents
);

router.post(
    "/:examId/publish",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    publishExamResults
);

router.get(
    "/:examId",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(examIdParamsSchema),
    getExamResults
);

router.post(
    "/",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(saveResultSchema),
    saveResult
);

export default router;

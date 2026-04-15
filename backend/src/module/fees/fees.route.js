import express from "express";
import {
    createFeeStructure,
    getFeeStructures,
    updateFeeStructure,
    deleteFeeStructure,
    generateAssignments,
    updateAssignment,
    recordPayment,
    getClassFeeOverview,
    getAllClassesFeeOverview,
    getYearlyFeeSummary,
    getStudentFeeHistory,
    getMyFees,
    getFeeTypes,
    createFeeType,
    getPenaltyTypes,
    createPenaltyType,
    getStudentsByClass,
    getPenaltyStudentsByClass,
    getStudentPenalties,
    createStudentPenalty,
} from "./fees.controller.js";
import {
    createSalaryEntry,
    getSalaryEntries,
    getTeacherSalary,
    updateSalaryStatus,
} from "./salary.controller.js";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";

import { requireFeature } from "../../middlewares/feature.middleware.js";
import checkWebOnly from "../../middlewares/checkWebOnly.js";
import { validate } from "../../middlewares/validation.middleware.js";
import {
    createFeeStructureSchema,
    updateFeeStructureSchema,
    feeStructureIdParamsSchema,
    getFeeStructuresQuerySchema,
    generateAssignmentsSchema,
    updateAssignmentSchema,
    recordPaymentSchema,
    classOverviewSchema,
    allClassesOverviewSchema,
    yearlySummarySchema,
    studentFeeHistorySchema,
    myFeesSchema,
    createFeeTypeSchema,
    createPenaltyTypeSchema,
    createStudentPenaltySchema,
    getStudentsByClassSchema,
    getPenaltyStudentsByClassSchema,
    getStudentPenaltiesSchema,
} from "./fees.validation.js";
import {
    createSalarySchema,
    getSalaryEntriesSchema,
    getTeacherSalarySchema,
    updateSalaryStatusSchema,
} from "./salary.validation.js";

const router = express.Router();

// Global middleware for all fee routes
router.use(requireFeature("fees"));

// ── Student Route (mobile + web) ─────────────────────────────
router.get(
    "/my-fees",
    checkRole([USER_ROLES.STUDENT]),
    validate(myFeesSchema),
    getMyFees
);

// ── Shared: Student Fee History (Admin Only, mobile + web)
router.get(
    "/student/:studentId/history",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(studentFeeHistorySchema),
    getStudentFeeHistory
);

// ── Admin: Fee Structure Config (web-only) ───────────────────
router.post(
    "/structures",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(createFeeStructureSchema),
    createFeeStructure
);

router.get(
    "/structures",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(getFeeStructuresQuerySchema),
    getFeeStructures
);

router.put(
    "/structures/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(updateFeeStructureSchema),
    updateFeeStructure
);

router.delete(
    "/structures/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(feeStructureIdParamsSchema),
    deleteFeeStructure
);

// ── Admin: Assignment Generation & Management (web-only) ─────
router.post(
    "/structures/:id/generate",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(generateAssignmentsSchema),
    generateAssignments
);

router.patch(
    "/assignments/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(updateAssignmentSchema),
    updateAssignment
);

// ── Admin: Payment Recording (web-only) ──────────────────────
router.post(
    "/assignments/:id/pay",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(recordPaymentSchema),
    recordPayment
);

// ── Dashboards & Reports ─────────────────────────────────────
router.get(
    "/overview/all-classes",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(allClassesOverviewSchema),
    getAllClassesFeeOverview
);

router.get(
    "/overview/:standard/:section",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.TEACHER]),
    validate(classOverviewSchema),
    getClassFeeOverview
);

router.get(
    "/summary/yearly",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(yearlySummarySchema),
    getYearlyFeeSummary
);

// ── Salary Routes ────────────────────────────────────────────
router.post(
    "/salaries",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(createSalarySchema),
    createSalaryEntry
);

router.get(
    "/salaries",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(getSalaryEntriesSchema),
    getSalaryEntries
);

router.get(
    "/salaries/my",
    checkRole([USER_ROLES.TEACHER]),
    validate(getTeacherSalarySchema),
    getTeacherSalary
);

router.patch(
    "/salaries/:id",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(updateSalaryStatusSchema),
    updateSalaryStatus
);


// ── Admin: Fee Type Management ────────────────────────────────
router.get(
    "/types",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    getFeeTypes
);

router.post(
    "/types",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(createFeeTypeSchema),
    createFeeType
);

router.get(
    "/penalty-types",
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    getPenaltyTypes
);

router.post(
    "/penalty-types",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(createPenaltyTypeSchema),
    createPenaltyType
);

// ── Student Penalty Routes ────────────────────────────────────
router.get(
    "/students-by-class",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(getStudentsByClassSchema),
    getStudentsByClass
);

router.get(
    "/penalties/students",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(getPenaltyStudentsByClassSchema),
    getPenaltyStudentsByClass
);

router.get(
    "/penalties",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(getStudentPenaltiesSchema),
    getStudentPenalties
);

router.post(
    "/penalties",
    checkWebOnly,
    checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]),
    validate(createStudentPenaltySchema),
    createStudentPenalty
);

export default router;

import express from "express";
import { checkRole } from "../../middlewares/role.middleware.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { validate } from "../../middlewares/validation.middleware.js";
import * as controller from "./proxy.controller.js";
import * as validation from "./proxy.validation.js";

const router = express.Router();

// All routes require authentication (applied via middleware in index.route.js)

/**
 * TEACHER ROUTES
 */

// Create proxy request (teacher marks themselves unavailable)
router.post(
    "/requests",
    checkRole([USER_ROLES.TEACHER]),
    validate(validation.createProxyRequestSchema),
    controller.createProxyRequest
);

// Get my proxy requests (teacher view)
router.get(
    "/requests/my",
    checkRole([USER_ROLES.TEACHER]),
    controller.getMyProxyRequests
);

// Cancel my proxy request
router.patch(
    "/requests/:requestId/cancel",
    checkRole([USER_ROLES.TEACHER]),
    validate(validation.cancelProxyRequestSchema),
    controller.cancelProxyRequest
);

// Get my schedule with proxies for a date
router.get(
    "/schedule/my",
    checkRole([USER_ROLES.TEACHER]),
    validate(validation.getTeacherScheduleSchema),
    controller.getMyScheduleWithProxies
);

/**
 * ADMIN ROUTES
 */

// Get all proxy requests (admin view with filters)
router.get(
    "/requests",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.getProxyRequestsSchema),
    controller.getProxyRequests
);

// Get available teachers for a proxy slot
router.get(
    "/available-teachers",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.getAvailableTeachersSchema),
    controller.getAvailableTeachers
);

// Assign proxy teacher to a request
router.post(
    "/requests/:requestId/assign",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.assignProxyTeacherSchema),
    controller.assignProxyTeacher
);

// Mark as free period
router.post(
    "/requests/:requestId/free-period",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.markAsFreePeriodSchema),
    controller.markAsFreePeriod
);

// Create direct proxy assignment (without teacher request)
router.post(
    "/assignments/direct",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.createDirectAssignmentSchema),
    controller.createDirectAssignment
);

// Update an existing proxy assignment
router.patch(
    "/assignments/:assignmentId",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]),
    validate(validation.updateProxyAssignmentSchema),
    controller.updateProxyAssignment
);

// Get proxy assignments for a date
router.get(
    "/assignments",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(validation.getProxyAssignmentsSchema),
    controller.getProxyAssignments
);

// Get timetable with proxy overrides (for rendering final schedule)
router.get(
    "/timetable-with-proxies",
    checkRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.TEACHER]),
    validate(validation.getTimetableWithProxiesSchema),
    controller.getTimetableWithProxies
);

export default router;

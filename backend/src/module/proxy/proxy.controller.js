import * as proxyService from "./proxy.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";

/**
 * Create a proxy request (teacher marks themselves unavailable)
 */
export const createProxyRequest = asyncHandler(async (req, res) => {
    const result = await proxyService.createProxyRequest(
        req.user,
        req.user.schoolId,
        req.body,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Proxy request created by teacher ${req.user._id}`);
    
    res.status(201).json({
        success: true,
        message: "Proxy request created successfully",
        data: result
    });
});

/**
 * Get all proxy requests (admin view)
 */
export const getProxyRequests = asyncHandler(async (req, res) => {
    const { status, date, fromDate, toDate, datePreset, teacherId, page, pageSize } = req.query;
    
    const result = await proxyService.getProxyRequests(req.user.schoolId, {
        status,
        date,
        fromDate,
        toDate,
        datePreset,
        teacherId,
        page: parseInt(page) || 0,
        pageSize: parseInt(pageSize) || 25
    });

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get proxy requests for logged-in teacher
 */
export const getMyProxyRequests = asyncHandler(async (req, res) => {
    const { status, date } = req.query;
    
    const result = await proxyService.getTeacherProxyRequests(
        req.user._id,
        req.user.schoolId,
        { status, date }
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get available teachers for a proxy slot
 */
export const getAvailableTeachers = asyncHandler(async (req, res) => {
    const { date, dayOfWeek, timeSlotId, subject, standard, section } = req.query;
    
    const result = await proxyService.getAvailableTeachersForProxy(
        req.user.schoolId,
        date,
        dayOfWeek,
        timeSlotId,
        subject,
        standard,
        section
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Assign a proxy teacher (admin action)
 */
export const assignProxyTeacher = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { proxyTeacherId, notes } = req.body;
    
    const result = await proxyService.assignProxyTeacher(
        req.user,
        req.user.schoolId,
        requestId,
        { proxyTeacherId, notes },
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Proxy teacher assigned by admin ${req.user._id} for request ${requestId}`);
    
    res.status(200).json({
        success: true,
        message: "Proxy teacher assigned successfully",
        data: result
    });
});

/**
 * Mark as free period (admin action)
 */
export const markAsFreePeriod = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const { notes } = req.body;
    
    const result = await proxyService.markAsFreePeriod(
        req.user,
        req.user.schoolId,
        requestId,
        notes,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Free period marked by admin ${req.user._id} for request ${requestId}`);
    
    res.status(200).json({
        success: true,
        message: "Class marked as free period successfully",
        data: result
    });
});

/**
 * Create direct proxy assignment (admin action without teacher request)
 */
export const createDirectAssignment = asyncHandler(async (req, res) => {
    const result = await proxyService.createDirectProxyAssignment(
        req.user,
        req.user.schoolId,
        req.body,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Direct proxy assignment created by admin ${req.user._id}`);
    
    res.status(201).json({
        success: true,
        message: "Proxy assignment created successfully",
        data: result
    });
});

/**
 * Get proxy assignments for a date
 */
export const getProxyAssignments = asyncHandler(async (req, res) => {
    const { date } = req.query;
    
    const result = await proxyService.getProxyAssignmentsForDate(
        req.user.schoolId,
        date
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get timetable with proxy overrides applied
 */
export const getTimetableWithProxies = asyncHandler(async (req, res) => {
    const { standard, section, date } = req.query;
    
    const result = await proxyService.getTimetableWithProxyOverrides(
        req.user.schoolId,
        standard,
        section,
        date
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Update an existing proxy assignment (admin action)
 */
export const updateProxyAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { type, proxyTeacherId, notes } = req.body;

    const result = await proxyService.updateProxyAssignment(
        req.user,
        req.user.schoolId,
        assignmentId,
        { type, proxyTeacherId, notes },
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Proxy assignment ${assignmentId} updated by admin ${req.user._id}`);

    res.status(200).json({
        success: true,
        message: "Proxy assignment updated successfully",
        data: result
    });
});

/**
 * Cancel a proxy request (teacher action)
 */
export const cancelProxyRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    
    const result = await proxyService.cancelProxyRequest(
        req.user,
        req.user.schoolId,
        requestId,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
    );

    logger.info(`Proxy request ${requestId} cancelled by teacher ${req.user._id}`);
    
    res.status(200).json({
        success: true,
        message: "Proxy request cancelled successfully",
        data: result
    });
});

/**
 * Get teacher's schedule with proxy information for a date
 */
export const getMyScheduleWithProxies = asyncHandler(async (req, res) => {
    const { date } = req.query;
    
    const result = await proxyService.getTeacherScheduleWithProxies(
        req.user.schoolId,
        req.user._id,
        date
    );

    res.status(200).json({
        success: true,
        data: result
    });
});

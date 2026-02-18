import * as timetableService from "./timetable.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { ForbiddenError, BadRequestError } from "../../utils/customError.js";

// TimeSlot Controllers

export const createTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.createTimeSlot(req.schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "Time slot created",
        data: result
    });
    logger.info(`Time slot created: ${result.slotNumber}`);
});

export const getTimeSlots = asyncHandler(async (req, res) => {
    const result = await timetableService.getTimeSlots(req.schoolId);
    res.status(200).json({
        success: true,
        data: result
    });
});

export const updateTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.updateTimeSlot(req.schoolId, req.params.id, req.body);
    res.status(200).json({
        success: true,
        message: "Time slot updated",
        data: result
    });
});

export const deleteTimeSlot = asyncHandler(async (req, res) => {
    await timetableService.deleteTimeSlot(req.schoolId, req.params.id);
    res.status(200).json({
        success: true,
        message: "Time slot deleted"
    });
});

// Timetable Controllers

// Create a new timetable (Header only)
export const createTimetable = asyncHandler(async (req, res) => {
    const result = await timetableService.createTimetable(req.schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "Timetable created",
        data: result
    });
    logger.info(`Timetable created: ${result._id}`);
});

// Get all timetables (Admin sees all, Teacher sees assigned)
export const getTimetables = asyncHandler(async (req, res) => {
    const teacherId = req.user.role === USER_ROLES.TEACHER ? req.user._id : null;
    const result = await timetableService.getTimetables(req.schoolId, teacherId);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Get specific timetable with entries
export const getTimetableById = asyncHandler(async (req, res) => {
    const result = await timetableService.getTimetableById(req.schoolId, req.params.id);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Delete a timetable
export const deleteTimetable = asyncHandler(async (req, res) => {
    await timetableService.deleteTimetable(req.schoolId, req.params.id);
    res.status(200).json({
        success: true,
        message: "Timetable deleted"
    });
});

// Entry Controllers

// Add a single entry
export const addEntry = asyncHandler(async (req, res) => {
    const timetableId = req.params.id;
    // Reuse sync logic for single entry (wrap in array)
    const result = await timetableService.createEntries(req.schoolId, timetableId, [req.body]);

    // Check for failure
    if (result.failed.length > 0) {
        const failure = result.failed[0];
        throw new BadRequestError(failure.reason || "Failed to create entry");
    }

    res.status(201).json({
        success: true,
        message: "Entry created",
        data: result
    });
});

// Sync entries in bulk
export const syncTimetableEntries = asyncHandler(async (req, res) => {
    const timetableId = req.params.id;
    const result = await timetableService.createEntries(req.schoolId, timetableId, req.body.entries);
    res.status(200).json({
        success: true,
        message: "Entries processed",
        data: result
    });
});

// Update a single entry
export const updateEntry = asyncHandler(async (req, res) => {
    const result = await timetableService.updateEntry(
        req.schoolId,
        req.params.entryId,
        req.body,
        req.user._id,
        req.user.role
    );
    res.status(200).json({
        success: true,
        message: "Entry updated",
        data: result
    });
});

// Delete a single entry
export const deleteEntry = asyncHandler(async (req, res) => {
    await timetableService.deleteEntry(req.schoolId, req.params.entryId);
    res.status(200).json({
        success: true,
        message: "Entry deleted"
    });
});

// Schedule Controllers

// Get teacher's schedule (Admin view)
export const getTeacherSchedule = asyncHandler(async (req, res) => {
    const { teacherId } = req.params;

    // Security check: Teachers can't spy on other teachers
    if (req.user.role === USER_ROLES.TEACHER && String(req.user._id) !== String(teacherId)) {
        throw new ForbiddenError("Access denied");
    }

    const result = await timetableService.getTeacherSchedule(req.schoolId, teacherId);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Get my schedule (Teacher/Student)
export const getMyTimetable = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const schoolId = req.user.schoolId;
    const role = req.user.role;
    const platform = req.query.platform || "web";

    logger.info(`userId : ${userId}, schoolId: ${schoolId}, role: ${role}, platform: ${platform}`);

    const result = await timetableService.getUserTimetable(schoolId, userId, role, platform);
    res.status(200).json({
        success: true,
        data: result
    });
});

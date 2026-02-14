import * as timetableService from "./timetable.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import { BadRequestError, ForbiddenError } from "../../utils/customError.js";

// Create a new time slot
export const createTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimeSlots(req.schoolId, 'create', req.body);
    res.status(201).json({
        success: true,
        message: "Time slot created",
        data: result
    });
    logger.info(`Time slot created: ${result.slot.slotNumber}`);
});

// Get all active time slots
export const getTimeSlots = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimeSlots(req.schoolId, 'get');
    res.status(200).json({
        success: true,
        data: result
    });
});

// Update a time slot
export const updateTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimeSlots(req.schoolId, 'update', { ...req.body, id: req.params.id });
    res.status(200).json({
        success: true,
        message: "Time slot updated",
        data: result
    });
});

// Soft-delete a time slot
export const deleteTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimeSlots(req.schoolId, 'delete', { id: req.params.id });
    res.status(200).json({
        success: true,
        message: "Time slot deleted",
        data: result
    });
});

// Create a new timetable
export const createTimetable = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimetables(req.schoolId, 'create', req.body);
    res.status(201).json({
        success: true,
        message: "Timetable created",
        data: result
    });
    logger.info(`Timetable created: ${result.timetable.standard}-${result.timetable.section}`);
});

// Get all active timetables
export const getTimetables = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimetables(req.schoolId, 'get_all', req.query);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Get specific timetable with entries
export const getTimetableById = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimetables(req.schoolId, 'get_one', { id: req.params.id });
    res.status(200).json({
        success: true,
        data: result
    });
});

// Soft-delete a timetable
export const deleteTimetable = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimetables(req.schoolId, 'delete', { id: req.params.id });
    res.status(200).json({
        success: true,
        message: "Timetable deleted",
        data: result
    });
});

// Update Timetable Status
export const updateTimetableStatus = asyncHandler(async (req, res) => {
    const result = await timetableService.manageTimetables(req.schoolId, 'update_status', {
        id: req.params.id,
        status: req.body.status
    });
    res.status(200).json({
        success: true,
        message: "Timetable status updated",
        data: result
    });
});

// Add a single entry
export const addEntry = asyncHandler(async (req, res) => {
    const timetableId = req.params.id;
    // Reuse sync logic for single entry (wrap in array)
    const result = await timetableService.syncEntries(req.schoolId, timetableId, [req.body]);
    
    // Check for failure
    if (result.syncResult.failedEntries.length > 0) {
        const failure = result.syncResult.failedEntries[0];
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
    // Determine timetableId: param > body > query? Usually param for hierarchy
    const timetableId = req.params.id;
    const result = await timetableService.syncEntries(req.schoolId, timetableId, req.body.entries);
    res.status(200).json({
        success: true,
        message: "Entries synced",
        data: result
    });
});

// Update a single entry (Teachers can only edit their own entries)
export const updateEntry = asyncHandler(async (req, res) => {
    const result = await timetableService.updateEntry(
        req.schoolId, 
        req.params.entryId, 
        req.body,
        req.user // Pass user for permission check
    );
    res.status(200).json({
        success: true,
        message: "Entry updated",
        data: result
    });
});

// Delete a single entry
export const deleteEntry = asyncHandler(async (req, res) => {
    const result = await timetableService.deleteEntry(req.schoolId, req.params.entryId);
    res.status(200).json({
        success: true,
        message: "Entry deleted",
        data: result
    });
});

// Get teacher's chronological schedule
export const getTeacherSchedule = asyncHandler(async (req, res) => {
    const { teacherId } = req.params;

    if (req.user.role === USER_ROLES.TEACHER && String(req.user._id) !== String(teacherId)) {
        throw new ForbiddenError("Access denied");
    }

    const result = await timetableService.getTeacherSchedule(req.schoolId, teacherId, req.query.academicYear);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Get my (logged-in teacher/student/user) schedule
export const getMySchedule = asyncHandler(async (req, res) => {
    // Assuming teacher for now, but could be extended for students based on role
    // Service expects teacherId
    const teacherId = req.user._id;
    const result = await timetableService.getTeacherSchedule(req.schoolId, teacherId, req.query.academicYear);
    res.status(200).json({
        success: true,
        data: result
    });
});

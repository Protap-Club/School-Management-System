import * as timetableService from "./timetable.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { ConflictError } from "../../utils/customError.js";

// TIMESLOT CONTROLLERS

// creates a new bell schedule time slot for the school
export const createTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.createTimeSlot(req.schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "Time slot created",
        data: result
    });
    logger.info(`Time slot created: ${result.slotNumber}`);
});

// returns all bell schedule time slots for the school
export const getTimeSlots = asyncHandler(async (req, res) => {
    const result = await timetableService.getTimeSlots(req.schoolId);
    res.status(200).json({
        success: true,
        data: result
    });
});

// updates an existing time slot (slot number, times, type, etc.)
export const updateTimeSlot = asyncHandler(async (req, res) => {
    const result = await timetableService.updateTimeSlot(req.schoolId, req.params.id, req.body);
    res.status(200).json({
        success: true,
        message: "Time slot updated",
        data: result
    });
});

// deletes a time slot (will fail if any entry is still using it)
export const deleteTimeSlot = asyncHandler(async (req, res) => {
    await timetableService.deleteTimeSlot(req.schoolId, req.params.id);
    res.status(204).end();
});

// TIMETABLE CONTROLLERS

// lists all timetable headers for the school (admin use for management)
export const getTimetables = asyncHandler(async (req, res) => {
    const result = await timetableService.getTimetables(req.schoolId, req.query);
    res.status(200).json({
        success: true,
        data: result
    });
});

// creates a new timetable header for a specific class + section + academic year
export const createTimetable = asyncHandler(async (req, res) => {
    const result = await timetableService.createTimetable(req.schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "Timetable created",
        data: result
    });
    logger.info(`Timetable created: ${result._id}`);
});

// returns a specific timetable with all its entries (populated with teacher names, slot details)
export const getTimetableById = asyncHandler(async (req, res) => {
    const result = await timetableService.getTimetableById(req.schoolId, req.params.id);
    res.status(200).json({
        success: true,
        data: result
    });
});

// deletes a timetable and all its associated entries (hard delete)
export const deleteTimetable = asyncHandler(async (req, res) => {
    await timetableService.deleteTimetable(req.schoolId, req.params.id);
    res.status(204).end();
});

// ENTRY CONTROLLERS

// adds a single entry to a timetable (wraps it in array for the bulk service)
export const addEntry = asyncHandler(async (req, res) => {
    const timetableId = req.params.id;
    // reuse bulk logic — wrap single entry in array to avoid duplicate code
    const result = await timetableService.createEntries(req.schoolId, timetableId, [req.body]);

    // if the single entry failed conflict check, throw error instead of returning partial result
    if (result.failed.length > 0) {
        const failure = result.failed[0];
        throw new ConflictError(
            failure.reason || "Teacher schedule conflict",
            "TEACHER_SCHEDULE_CONFLICT",
            failure.conflict ? { conflict: failure.conflict } : null
        );
    }

    res.status(201).json({
        success: true,
        message: "Entry created",
        data: result
    });
});

// updates a single timetable entry (admin-only — role enforced at route level)
export const updateEntry = asyncHandler(async (req, res) => {
    const result = await timetableService.updateEntry(
        req.schoolId,
        req.params.entryId,
        req.body
    );
    res.status(200).json({
        success: true,
        message: "Entry updated",
        data: result
    });
});

// deletes a single timetable entry
export const deleteEntry = asyncHandler(async (req, res) => {
    await timetableService.deleteEntry(req.schoolId, req.params.entryId);
    res.status(204).end();
});

// SCHEDULE CONTROLLERS

// returns a specific teacher's weekly schedule (admin view)
export const getTeacherSchedule = asyncHandler(async (req, res) => {
    const result = await timetableService.getTeacherSchedule(req.schoolId, req.params.teacherId);
    res.status(200).json({
        success: true,
        data: result
    });
});

// returns the logged-in user's own schedule (teacher or student)
// teacher sees all their assigned classes, student sees their class timetable
// mobile platform gets a simplified response shape
export const getMyTimetable = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const userId = req.user._id;
    const role = req.user.role;
    const platform = req.platform;

    logger.debug(`getMyTimetable — userId: ${userId}, schoolId: ${schoolId}, role: ${role}, platform: ${platform}`);

    const result = await timetableService.getUserTimetable(schoolId, userId, role, platform);
    res.status(200).json({
        success: true,
        data: result
    });
});

// returns the logged-in teacher's class timetable
// only works for teachers who are assigned as class teachers
// shows the full timetable for their assigned class
export const getMyClassTimetable = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const teacherId = req.user._id;
    const platform = req.platform;

    logger.debug(`getMyClassTimetable — teacherId: ${teacherId}, schoolId: ${schoolId}, platform: ${platform}`);

    const result = await timetableService.getTeacherClassTimetable(schoolId, teacherId, platform);
    res.status(200).json({
        success: true,
        data: result
    });
});

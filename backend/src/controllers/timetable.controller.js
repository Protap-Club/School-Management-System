/**
 * Timetable Controller - Handles HTTP requests for Timetable feature.
 * Covers TimeSlot, Timetable, TimetableEntry, and Teacher Schedule operations.
 */

import * as timetableService from "../services/timetable.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";
import { USER_ROLES } from "../constants/userRoles.js";

// ═══════════════════════════════════════════════════════════════
// TimeSlot Controllers
// ═══════════════════════════════════════════════════════════════

export const createTimeSlot = asyncHandler(async (req, res) => {
    logger.info(`Creating time slot for school ${req.schoolId}`);
    
    const slot = await timetableService.createTimeSlot(req.schoolId, req.body);
    
    res.status(201).json({
        success: true,
        message: "Time slot created successfully",
        data: slot
    });
});

export const getTimeSlots = asyncHandler(async (req, res) => {
    logger.info(`Fetching time slots for school ${req.schoolId}`);
    
    const slots = await timetableService.getTimeSlots(req.schoolId);
    
    res.status(200).json({
        success: true,
        count: slots.length,
        data: slots
    });
});

export const updateTimeSlot = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Updating time slot ${id}`);
    
    const slot = await timetableService.updateTimeSlot(req.schoolId, id, req.body);
    
    res.status(200).json({
        success: true,
        message: "Time slot updated successfully",
        data: slot
    });
});

export const deleteTimeSlot = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Deleting time slot ${id}`);
    
    const result = await timetableService.deleteTimeSlot(req.schoolId, id);
    
    res.status(200).json({
        success: true,
        message: result.message
    });
});

// ═══════════════════════════════════════════════════════════════
// Timetable Controllers
// ═══════════════════════════════════════════════════════════════

export const createTimetable = asyncHandler(async (req, res) => {
    logger.info(`Creating timetable for school ${req.schoolId}`);
    
    const timetable = await timetableService.createTimetable(req.schoolId, req.body);
    
    res.status(201).json({
        success: true,
        message: "Timetable created successfully",
        data: timetable
    });
});

export const getTimetables = asyncHandler(async (req, res) => {
    logger.info(`Fetching timetables for school ${req.schoolId}`);
    
    const { standard, section, academicYear } = req.query;
    const timetables = await timetableService.getTimetables(req.schoolId, {
        standard,
        section,
        academicYear: academicYear ? Number(academicYear) : undefined
    });
    
    res.status(200).json({
        success: true,
        count: timetables.length,
        data: timetables
    });
});

export const getTimetableById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Fetching timetable ${id}`);
    
    const result = await timetableService.getTimetableById(req.schoolId, id);
    
    res.status(200).json({
        success: true,
        data: result
    });
});

export const updateTimetableStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    logger.info(`Updating timetable ${id} status to ${status}`);
    
    const timetable = await timetableService.updateTimetableStatus(req.schoolId, id, status);
    
    res.status(200).json({
        success: true,
        message: `Timetable ${status.toLowerCase()} successfully`,
        data: timetable
    });
});

export const deleteTimetable = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Deleting timetable ${id}`);
    
    const result = await timetableService.deleteTimetable(req.schoolId, id);
    
    res.status(200).json({
        success: true,
        message: result.message
    });
});

// ═══════════════════════════════════════════════════════════════
// TimetableEntry Controllers
// ═══════════════════════════════════════════════════════════════

export const createEntry = asyncHandler(async (req, res) => {
    const { id: timetableId } = req.params;
    logger.info(`Creating entry for timetable ${timetableId}`);
    
    const entry = await timetableService.createEntry(req.schoolId, timetableId, req.body);
    
    res.status(201).json({
        success: true,
        message: "Entry created successfully",
        data: entry
    });
});

export const createBulkEntries = asyncHandler(async (req, res) => {
    const { id: timetableId } = req.params;
    const { entries } = req.body;
    logger.info(`Creating ${entries.length} bulk entries for timetable ${timetableId}`);
    
    const result = await timetableService.createBulkEntries(req.schoolId, timetableId, entries);
    
    res.status(201).json({
        success: true,
        message: `Created ${result.created.length} entries, ${result.failed.length} failed`,
        data: result
    });
});

export const updateEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Updating entry ${id}`);
    
    const entry = await timetableService.updateEntry(req.schoolId, id, req.body);
    
    res.status(200).json({
        success: true,
        message: "Entry updated successfully",
        data: entry
    });
});

export const deleteEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.info(`Deleting entry ${id}`);
    
    const result = await timetableService.deleteEntry(req.schoolId, id);
    
    res.status(200).json({
        success: true,
        message: result.message
    });
});

// ═══════════════════════════════════════════════════════════════
// Teacher Schedule Controller
// ═══════════════════════════════════════════════════════════════

export const getTeacherSchedule = asyncHandler(async (req, res) => {
    const { teacherId } = req.params;
    const { academicYear } = req.query;
    
    // Access control: Teacher can only view their own schedule
    if (req.user.role === USER_ROLES.TEACHER) {
        if (String(req.user._id) !== String(teacherId)) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own schedule"
            });
        }
    }
    
    logger.info(`Fetching schedule for teacher ${teacherId}`);
    
    const schedule = await timetableService.getTeacherSchedule(
        req.schoolId,
        teacherId,
        academicYear ? Number(academicYear) : null
    );
    
    res.status(200).json({
        success: true,
        data: schedule
    });
});

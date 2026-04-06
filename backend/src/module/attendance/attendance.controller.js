import * as nfcService from "./attendance.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { BadRequestError, ValidationError } from "../../utils/customError.js";

// Link NFC tag to student
export const linkTag = asyncHandler(async (req, res) => {
    const { studentId, nfcUid } = req.body;

    if (!studentId || !nfcUid) {
        throw new BadRequestError("StudentId and NFCID are Required");
    }

    // Call service to link tag
    const result = await nfcService.linkNfcTag(studentId, nfcUid);

    res.status(200).json({
        success: true,
        message: "NFC tag linked successfully",
        data: result
    });
    logger.info(`NFC linked: student ${studentId}`);
});

// Mark attendance via NFC
export const markAttendance = asyncHandler(async (req, res) => {
    const { nfcUid } = req.body;
    if (!nfcUid) {
        throw new BadRequestError("NFCID is Required");
    }

    // schoolId is optional — service resolves it from the NFC-linked student record
    // When using x-device-key bypass, req.user is undefined, which is fine
    const schoolId = req.user?.schoolId;

    const result = await nfcService.markAttendanceByNfc(nfcUid, schoolId);

    res.status(201).json({
        success: true,
        message: "Attendance marked successfully",
        data: result
    });
    logger.info(`Attendance marked: ${result.attendance.student}`);
});

// Get Today's Attendance (unified — platform branching)
export const getTodayAttendance = asyncHandler(async (req, res) => {
    const platform = req.platform;

    logger.info("Controller: Attendance request", { userId: req.user._id, platform });

    const records = await nfcService.getTodayAttendance(req.user, platform);

    res.status(200).json({
        success: true,
        data: records
    });
});

// Get specific student's attendance by ID (mobile)
export const getStudentAttendanceById = asyncHandler(async (req, res) => {
    const { id: studentId } = req.params;
    const schoolId = req.user.schoolId?._id || req.user.schoolId;

    logger.info("Controller: Student attendance by ID request", { studentId, userId: req.user._id });

    const result = await nfcService.getStudentAttendanceById(studentId, schoolId);

    res.status(200).json({
        success: true,
        data: result
    });
});

// Mark attendance manually (teacher/admin toggle)
export const markManual = asyncHandler(async (req, res) => {
    const { studentId, status } = req.body;
    const markerUserId = req.user._id;
    const markerRole = req.user.role;
    const schoolId = req.user.schoolId?._id || req.user.schoolId;

    const result = await nfcService.markManualAttendance(markerUserId, markerRole, studentId, status, schoolId);

    res.status(200).json({
        success: true,
        message: `Student marked as ${status}`,
        data: result
    });
});

import * as nfcService from "../services/attendence.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

// Link NFC tag to student
export const linkTag = asyncHandler(async (req, res) => {
    const { studentId, nfcUid } = req.body;

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
    const nfcUid = req.body.nfcUid || req.query.nfcUid;

    // Mark attendance in service
    const result = await nfcService.markAttendanceByNfc(nfcUid, req.user.schoolId);

    res.status(201).json({ 
        success: true, 
        message: "Attendance marked successfully", 
        data: result 
    });
    logger.info(`Attendance marked: ${result.attendance.student}`);
});

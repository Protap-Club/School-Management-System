import * as nfcService from "./attendence.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import logger from "../../config/logger.js";
import { BadRequestError, ValidationError } from "../../utils/customError.js";

// Link NFC tag to student
export const linkTag = asyncHandler(async (req, res) => {
    const { studentId, nfcUid } = req.body;

    if(!studentId || !nfcUid){
        throw new BadRequestError("Studenid and NFCID is Required");
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
    const nfcUid = req.body.nfcUid || req.query.nfcUid;
    if(!nfcUid){
        throw new BadRequestError("NFCID is Required");
    }

    // Mark attendance in service
    const schoolId = req.user ? req.user.schoolId : undefined;
    if(!schoolId){
        throw new BadRequestError("Schoolid is required");
    }
    
    const result = await nfcService.markAttendanceByNfc(nfcUid, schoolId);

    res.status(201).json({ 
        success: true, 
        message: "Attendance marked successfully", 
        data: result 
    });
    logger.info(`Attendance marked: ${result.attendance.student}`);
});

// Get Today's Attendance
export const getTodayAttendance = asyncHandler(async (req, res) => {
    const records = await nfcService.getTodayAttendance(req.user.schoolId);

    res.status(200).json({
        success: true,
        data: records
    });
});

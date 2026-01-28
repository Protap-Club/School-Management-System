import { nfcService } from "../services/attendence.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Handles requests related to NFC (Near Field Communication) operations.
 * This includes linking NFC tags to students and marking attendance via NFC.
 */

/**
 * Links an NFC tag to a student.
 * Expects `studentId` and `nfcUid` in the request body.
 * Delegates the core logic to `nfcService.linkTag`.
 * POST /api/v1/nfc/link
 */
const linkTag = asyncHandler(async (req, res) => {
    const { studentId, nfcUid } = req.body;
    logger.info(`Received request to link NFC tag for student ID: ${studentId}, NFC UID: ${nfcUid}`);
    
    // Call the NFC service to handle the business logic of linking the tag.
    const result = await nfcService.linkTag(studentId, nfcUid);

    // Respond with success.
    res.status(200).json({
        success: true,
        message: "NFC tag linked successfully",
        data: result
    });
    logger.info(`NFC tag ${nfcUid} successfully linked to student ${studentId}.`);
});

/**
 * Marks attendance for a student using an NFC UID.
 * The NFC UID can be provided in the request body or query parameters.
 * Delegates the core logic to `nfcService.markAttendance`.
 * POST /api/v1/nfc/attendance
 */
const markAttendance = asyncHandler(async (req, res) => {
    // Attempt to parse body for different content types (e.g., text/plain from NFC readers).
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
        try {
            parsedBody = JSON.parse(req.body);
        } catch {
            // If JSON parsing fails, retain original body to attempt query param extraction.
            logger.debug("Could not parse request body as JSON for attendance marking.");
        }
    }

    // Extract NFC UID from either body or query parameters.
    const nfcUid = parsedBody?.nfcUid || req.query?.nfcUid;
    logger.info(`Received request to mark attendance with NFC UID: ${nfcUid}`);

    // Call the NFC service to handle the business logic of marking attendance.
    const result = await nfcService.markAttendance(nfcUid);

    // Respond with success.
    res.status(201).json({
        success: true,
        message: "Attendance marked successfully",
        data: result
    });
    logger.info(`Attendance marked successfully for student ${result.studentId} with NFC UID ${nfcUid}.`);
});

export { linkTag, markAttendance };

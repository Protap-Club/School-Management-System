import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import { getIO } from "../index.js";
import { CustomError } from "../utils/customError.js";
import logger from "../config/logger.js"; // Import the logger

/**
 * Service for handling NFC (Near Field Communication) related business logic,
 * such as linking NFC tags to students and marking attendance.
 */

/**
 * Links an NFC tag UID to a specific student.
 * Ensures that the student exists, has the 'student' role, and the NFC tag is not already linked to another user.
 *
 * @param {string} studentId - The unique identifier of the student.
 * @param {string} nfcUid - The unique identifier of the NFC tag.
 * @returns {Promise<object>} An object containing the student's ID, name, and linked NFC UID.
 * @throws {CustomError} If studentId or nfcUid are missing, NFC tag is already linked, student not found, or student is not in 'student' role.
 */
const linkTag = async (studentId, nfcUid) => {
    logger.info(`Attempting to link NFC tag for studentId: ${studentId}, nfcUid: ${nfcUid}`);

    // Validate required input parameters.
    if (!studentId || !nfcUid) {
        logger.warn("NFC linkTag failed: studentId or nfcUid missing.");
        throw new CustomError("studentId and nfcUid are required", 400);
    }

    const trimmedNfcUid = nfcUid.trim();

    // Check if the NFC UID is already associated with another user to prevent duplicates.
    const existingUser = await User.findOne({ nfcUid: trimmedNfcUid });
    if (existingUser && existingUser._id.toString() !== studentId) {
        logger.warn(`NFC tag ${nfcUid} is already linked to another user: ${existingUser._id}`);
        throw new CustomError("This NFC tag is already linked to another student", 409, "NFC_ALREADY_LINKED");
    }

    // Find the student by their ID.
    const student = await User.findById(studentId);
    if (!student) {
        logger.warn(`NFC linkTag failed: Student not found with ID ${studentId}`);
        throw new CustomError("Student not found", 404);
    }

    // Ensure that NFC tags are only linked to users with the 'student' role.
    if (student.role !== "student") {
        logger.warn(`NFC linkTag failed: User ${studentId} is not a student.`);
        throw new CustomError("NFC tags can only be linked to students", 400);
    }

    // Assign the NFC UID to the student and save the updated record.
    student.nfcUid = trimmedNfcUid;
    await student.save();
    logger.info(`NFC tag ${trimmedNfcUid} successfully linked to student ${studentId}.`);

    return {
        studentId: student._id,
        studentName: student.name,
        nfcUid: student.nfcUid
    };
};

/**
 * Marks attendance for a student using their NFC tag UID.
 * Ensures attendance is marked only once per student per day and emits a Socket.io event.
 *
 * @param {string} nfcUid - The unique identifier of the NFC tag used for attendance.
 * @returns {Promise<object>} The newly created attendance record.
 * @throws {CustomError} If nfcUid is missing, tag not registered, or attendance already marked for today.
 */
const markAttendance = async (nfcUid) => {
    logger.info(`Attempting to mark attendance for nfcUid: ${nfcUid}`);

    // Validate required input parameter.
    if (!nfcUid) {
        logger.warn("Mark attendance failed: nfcUid is missing.");
        throw new CustomError("nfcUid is required", 400);
    }

    // Find the student associated with the given NFC UID.
    const student = await User.findOne({ nfcUid: nfcUid.trim() });
    if (!student) {
        logger.warn(`Mark attendance failed: NFC tag ${nfcUid} not registered to any student.`);
        throw new CustomError("This NFC tag is not registered to any student", 404, "TAG_NOT_REGISTERED");
    }

    // Get the start of the current day for checking existing attendance.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance has already been marked for this student today.
    const existingAttendance = await Attendance.findOne({
        studentId: student._id,
        date: today
    });

    if (existingAttendance) {
        logger.info(`Attendance already marked for student ${student._id} today.`);
        throw new CustomError("Attendance already marked for today", 409, "ALREADY_MARKED", {
            studentId: student._id,
            studentName: student.name,
            checkInTime: existingAttendance.checkInTime
        });
    }

    // Create a new attendance record.
    const attendance = new Attendance({
        studentId: student._id,
        schoolId: student.schoolId,
        date: today,
        status: "Present",
        checkInTime: new Date(),
        markedBy: "NFC" // Indicates attendance was marked via NFC.
    });

    await attendance.save();
    logger.info(`Attendance successfully marked for student ${student._id} via NFC.`);

    // Emit a Socket.io event to the relevant school's room for real-time updates.
    const schoolIdStr = student.schoolId.toString();
    const io = getIO();
    io.to(`school-${schoolIdStr}`).emit("attendance-marked", {
        studentId: student._id.toString(),
        studentName: student.name,
        status: "Present",
        checkInTime: attendance.checkInTime
    });
    logger.debug(`Socket.io event 'attendance-marked' emitted for school ${schoolIdStr}.`);

    return {
        studentId: student._id,
        studentName: student.name,
        status: "Present",
        checkInTime: attendance.checkInTime
    };
};

export const nfcService = {
    linkTag,
    markAttendance
};

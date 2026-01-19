import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import { getIO } from "../index.js";

/**
 * Link NFC Tag to Student
 * POST /api/v1/nfc/link
 */
const linkTag = async (req, res) => {
    try {
        const { studentId, nfcUid } = req.body;

        if (!studentId || !nfcUid) {
            return res.status(400).json({
                success: false,
                message: "studentId and nfcUid are required"
            });
        }

        // Check if nfcUid is already linked to another user
        const existingUser = await User.findOne({ nfcUid: nfcUid.trim() });
        if (existingUser && existingUser._id.toString() !== studentId) {
            return res.status(409).json({
                success: false,
                code: "NFC_ALREADY_LINKED",
                message: "This NFC tag is already linked to another student"
            });
        }

        // Find and update the student
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        if (student.role !== "student") {
            return res.status(400).json({
                success: false,
                message: "NFC tags can only be linked to students"
            });
        }

        student.nfcUid = nfcUid.trim();
        await student.save();

        return res.status(200).json({
            success: true,
            message: "NFC tag linked successfully",
            data: {
                studentId: student._id,
                studentName: student.name,
                nfcUid: student.nfcUid
            }
        });
    } catch (error) {
        console.error("Link NFC Tag Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to link NFC tag"
        });
    }
};

/**
 * Mark Attendance via NFC
 * POST /api/v1/nfc/attendance
 */
const markAttendance = async (req, res) => {
    try {
        const { nfcUid } = req.body;

        if (!nfcUid) {
            return res.status(400).json({
                success: false,
                message: "nfcUid is required"
            });
        }

        // Find user by NFC UID
        const student = await User.findOne({ nfcUid: nfcUid.trim() });
        if (!student) {
            return res.status(404).json({
                success: false,
                code: "TAG_NOT_REGISTERED",
                message: "This NFC tag is not registered to any student"
            });
        }

        // Get today's date (start of day for comparison)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if attendance already marked today
        const existingAttendance = await Attendance.findOne({
            studentId: student._id,
            date: today
        });

        if (existingAttendance) {
            return res.status(409).json({
                success: false,
                code: "ALREADY_MARKED",
                message: "Attendance already marked for today",
                data: {
                    studentId: student._id,
                    studentName: student.name,
                    checkInTime: existingAttendance.checkInTime
                }
            });
        }

        // Create new attendance record
        const attendance = new Attendance({
            studentId: student._id,
            schoolId: student.schoolId,
            date: today,
            status: "Present",
            checkInTime: new Date(),
            markedBy: "NFC"
        });

        await attendance.save();

        // Emit Socket.io event to school room
        const io = getIO();
        io.to(`school-${student.schoolId}`).emit("attendance-marked", {
            studentId: student._id.toString(),
            studentName: student.name,
            status: "Present",
            checkInTime: attendance.checkInTime
        });

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            data: {
                studentId: student._id,
                studentName: student.name,
                status: "Present",
                checkInTime: attendance.checkInTime
            }
        });
    } catch (error) {
        console.error("Mark Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to mark attendance"
        });
    }
};

export { linkTag, markAttendance };

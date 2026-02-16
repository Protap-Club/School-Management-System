import User from "../user/model/User.model.js";
import Attendance from "./Attendance.model.js";
import { getIO } from "../../socket.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../utils/customError.js";
import logger from "../../config/logger.js";


// LINK NFC TAG
// Associates a physical card with a student account.

export const linkNfcTag = async (studentId, nfcUid) => {
    if (!studentId || !nfcUid) throw new BadRequestError("Missing required fields");

    const cleanUid = nfcUid.trim();

    // Check 1: Is this tag already taken by someone else?
    const conflict = await User.findOne({ nfcUid: cleanUid }).select("_id").lean();
    if (conflict && conflict._id.toString() !== studentId) {
        throw new ConflictError("Tag already registered to another user");
    }

    // Check 2: Update the student 
    // strictly ensure the user has role 'student' during the update query itself
    const updatedStudent = await User.findOneAndUpdate(
        { _id: studentId, role: "student" },
        { $set: { nfcUid: cleanUid } },
        { new: true, runValidators: true }
    ).select("name nfcUid").lean();

    if (!updatedStudent) {
        throw new NotFoundError("Student not found or user is not a student", 404);
    }

    const data = {
        name: updatedStudent.name,
        nfcUid: cleanUid,
        schoolId: updatedStudent.schoolId,
        role: updatedStudent.role,
        _id: updatedStudent._id,
    }

    logger.info(`NFC linked: ${updatedStudent.name} -> ${cleanUid}`);
    return { student: data };
};

// MARK ATTENDANCE (Via NFC)
// The core "Tap" function.

export const markAttendanceByNfc = async (nfcUid, schoolId) => {
    if (!nfcUid) throw new BadRequestError("NFC UID required");

    // Step 1: Find Student (Fast read)
    // Step 1: Find Student (Fast read)
    const query = { nfcUid: nfcUid.trim() };
    if (schoolId) query.schoolId = schoolId;

    const student = await User.findOne(query)
        .select("_id name schoolId role")
        .lean();

    if (!student) throw new NotFoundError("Tag not registered");

    // Step 2: Define "Today" (Reset time to midnight for consistency)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Step 3: Check if already present (Prevent double tapping)
    const existing = await Attendance.findOne({
        studentId: student._id,
        date: { $gte: startOfDay } // Matches anything from today onwards
    }).lean();

    if (existing) {
        throw new ConflictError("Attendance already marked", "ATTENDANCE_EXISTS", {
            studentName: student.name,
            time: existing.checkInTime
        });
    }

    // Step 4: Create Record
    const newRecord = await Attendance.create({
        studentId: student._id,
        schoolId: student.schoolId,
        date: startOfDay, // Stores the "Day"
        checkInTime: new Date(), // Stores the exact "Moment"
        status: "Present",
        markedBy: "NFC"
    });

    // Step 5: Real-time Update (Socket.io)
    try {
        const io = getIO();
        io.to(`school-${student.schoolId}`).emit("attendance-marked", {
            studentId: student._id,
            name: student.name,
            status: "Present",
            checkInTime: newRecord.checkInTime
        });
    } catch (err) {
        logger.warn(`Socket emit failed: ${err.message}`);
    }

    return {
        attendance: {
            student: student.name,
            status: "Present",
            checkInTime: newRecord.checkInTime
        }
    };
};

// GET TODAY'S ATTENDANCE
export const getTodayAttendance = async (schoolId) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const records = await Attendance.find({
        schoolId,
        date: { $gte: startOfDay }
    }).select("studentId status checkInTime").lean();

    return records; // Returns array of { studentId, status, checkInTime }
};
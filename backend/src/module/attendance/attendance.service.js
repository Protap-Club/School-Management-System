import User from "../user/model/User.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import Attendance from "./Attendance.model.js";
import { getIO } from "../../socket.js";
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from "../../utils/customError.js";
import logger from "../../config/logger.js";
import { USER_ROLES } from "../../constants/userRoles.js";


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
    });

    if (existing) {
        if (existing.status === "Present") {
            throw new ConflictError("Attendance already marked", "ATTENDANCE_EXISTS", {
                studentName: student.name,
                time: existing.checkInTime
            });
        } else {
            // The student was marked 'Absent' manually, but just tapped their card. 
            // We should update the record to 'Present'.
            existing.status = "Present";
            existing.checkInTime = new Date();
            existing.markedBy = "NFC";
            await existing.save();

            // Emit update & Return
            try {
                const io = getIO();
                io.to(`school-${student.schoolId}`).emit("attendance-marked", {
                    studentId: student._id,
                    name: student.name,
                    status: "Present",
                    checkInTime: existing.checkInTime
                });
            } catch (err) {
                logger.warn(`Socket emit failed: ${err.message}`);
            }

            return {
                attendance: {
                    student: student.name,
                    status: "Present",
                    checkInTime: existing.checkInTime
                }
            };
        }
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

// GET TODAY'S ATTENDANCE (Unified — platform branching like auth.service.js)
export const getTodayAttendance = async (user, platform) => {
    logger.info("Attendance request", { userId: user._id, role: user.role, platform });

    const schoolId = user.schoolId?._id || user.schoolId;

    if (platform === 'mobile') {
        if (user.role === USER_ROLES.STUDENT) {
            return await getStudentMobileAttendance(user._id, schoolId);
        } else if (user.role === USER_ROLES.TEACHER) {
            return await getTeacherMobileAttendance(user._id, schoolId);
        } else {
            throw new ForbiddenError("Only students and teachers can access mobile attendance");
        }
    }

    // For web:
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // If teacher, ONLY fetch records for students in their classTeacherOf class
    if (user.role === USER_ROLES.TEACHER) {
        const teacherProfile = await TeacherProfile.findOne({ userId: user._id, schoolId })
            .select("classTeacherOf")
            .lean();

        if (!teacherProfile?.classTeacherOf?.standard || !teacherProfile?.classTeacherOf?.section) {
            return []; // Not a class teacher, no students to show
        }

        const classStudents = await StudentProfile.find({
            schoolId,
            standard: teacherProfile.classTeacherOf.standard,
            section: teacherProfile.classTeacherOf.section
        }).select("userId").lean();

        const studentIds = classStudents.map(s => s.userId);

        if (!studentIds.length) return [];

        return await Attendance.find({
            schoolId,
            studentId: { $in: studentIds },
            date: { $gte: startOfDay }
        }).select("studentId status checkInTime").sort({ checkInTime: -1 }).lean();
    }

    // For admin/super_admin: fetch recent school records
    const records = await Attendance.find({
        schoolId,
        date: { $gte: startOfDay }
    }).select("studentId status checkInTime").sort({ checkInTime: -1 }).limit(200).lean();

    return records;
};


// ─── MOBILE HELPERS ─────────────────────────────────────────────

// STUDENT: Returns today's status + calendar (current month) + stats
const getStudentMobileAttendance = async (studentId, schoolId) => {
    const now = new Date();

    // Today check
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const todayRecord = await Attendance.findOne({
        studentId,
        schoolId,
        date: { $gte: startOfDay }
    }).select("status checkInTime").lean();

    // Calendar: All records for current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthRecords = await Attendance.find({
        studentId,
        schoolId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
    }).select("date status checkInTime").sort({ date: 1 }).lean();

    // Stats
    const totalPresent = monthRecords.filter(r => r.status === "Present").length;
    const totalDays = monthRecords.length;
    const totalAbsent = totalDays - totalPresent;
    const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 1000) / 10 : 0;

    return {
        today: todayRecord
            ? { status: todayRecord.status, checkInTime: todayRecord.checkInTime }
            : { status: "Absent", checkInTime: null },
        calendar: monthRecords.map(r => ({
            date: r.date,
            status: r.status,
            checkInTime: r.checkInTime
        })),
        stats: { totalDays, totalPresent, totalAbsent, percentage }
    };
};

// TEACHER: Returns assigned-class students with today's attendance status
const getTeacherMobileAttendance = async (teacherUserId, schoolId) => {
    // Step 1: Get teacher's assigned classes
    const teacherProfile = await TeacherProfile.findOne({ userId: teacherUserId, schoolId })
        .select("assignedClasses")
        .lean();

    if (!teacherProfile || !teacherProfile.assignedClasses?.length) {
        return { students: [] };
    }

    // Step 2: Build OR conditions for each assigned class (standard + section)
    const classConditions = teacherProfile.assignedClasses.map(c => ({
        schoolId,
        standard: c.standard,
        section: c.section
    }));

    // Step 3: Get all students in those classes
    const studentProfiles = await StudentProfile.find({ $or: classConditions })
        .select("userId rollNumber standard section fatherName fatherContact motherName motherContact")
        .populate("userId", "_id name email")
        .lean();

    if (!studentProfiles.length) {
        return { students: [] };
    }

    // Step 4: Get today's attendance for those students
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const studentIds = studentProfiles.map(s => s.userId._id);

    const todayRecords = await Attendance.find({
        schoolId,
        studentId: { $in: studentIds },
        date: { $gte: startOfDay }
    }).select("studentId status checkInTime").lean();

    // Step 5: Map records by studentId for fast lookup
    const attendanceMap = {};
    todayRecords.forEach(r => {
        attendanceMap[r.studentId.toString()] = r;
    });

    // Step 6: Combine — students without a record are "Absent"
    const students = studentProfiles.map(sp => {
        const record = attendanceMap[sp.userId._id.toString()];
        return {
            _id: sp.userId._id,
            name: sp.userId.name,
            email: sp.userId.email,
            rollNumber: sp.rollNumber,
            standard: sp.standard,
            section: sp.section,
            fatherName: sp.fatherName,
            fatherContact: sp.fatherContact,
            motherName: sp.motherName,
            motherContact: sp.motherContact,
            status: record ? record.status : "Absent",
            checkInTime: record ? record.checkInTime : null
        };
    });

    return { students };
};

// GET STUDENT ATTENDANCE BY ID (for mobile — fetches a specific student's attendance)
export const getStudentAttendanceById = async (studentId, schoolId) => {
    // Verify the student exists and belongs to the school
    const student = await User.findOne({ _id: studentId, schoolId, role: USER_ROLES.STUDENT })
        .select("_id name")
        .lean();

    if (!student) {
        throw new NotFoundError("Student not found");
    }

    return await getStudentMobileAttendance(studentId, schoolId);
};

// ─── MANUAL ATTENDANCE ──────────────────────────────────────────

/**
 * Marks a student present or absent manually (by teacher or admin).
 * Teachers can only mark students in their assigned classes.
 * Admins can mark any student in the same school.
 * Uses upsert to create or update the record for today.
 * @param {string} markerUserId - The teacher/admin user ID who is marking
 * @param {string} markerRole - The role of the marker ("teacher" or "admin")
 * @param {string} studentId - The student being marked
 * @param {string} status - "Present" or "Absent"
 * @param {string} schoolId - The school context
 */
export const markManualAttendance = async (markerUserId, markerRole, studentId, status, schoolId) => {
    // Step 1: Verify student exists and belongs to the same school
    const student = await User.findOne({ _id: studentId, schoolId, role: USER_ROLES.STUDENT })
        .select("_id name schoolId")
        .lean();

    if (!student) {
        throw new NotFoundError("Student not found in this school");
    }

    // Step 2: If teacher, verify they are assigned to the student's class
    if (markerRole === USER_ROLES.TEACHER) {
        const studentProfile = await StudentProfile.findOne({ userId: studentId, schoolId })
            .select("standard section")
            .lean();

        if (!studentProfile) {
            throw new NotFoundError("Student profile not found");
        }

        const teacherProfile = await TeacherProfile.findOne({ userId: markerUserId, schoolId })
            .select("assignedClasses")
            .lean();

        if (!teacherProfile || !teacherProfile.assignedClasses?.length) {
            throw new ForbiddenError("You have no assigned classes");
        }

        // Check if teacher is assigned to the student's standard + section
        const isAssigned = teacherProfile.assignedClasses.some(
            c => c.standard === studentProfile.standard && c.section === studentProfile.section
        );

        if (!isAssigned) {
            throw new ForbiddenError("You can only mark attendance for students in your assigned classes");
        }
    }

    // Step 3: Upsert attendance record for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const updateFields = {
        status,
        markedBy: "Manual",
        markedByUserId: markerUserId,
    };

    // Only set checkInTime when marking present; clear it when absent
    if (status === "Present") {
        updateFields.checkInTime = new Date();
    } else {
        updateFields.checkInTime = null;
    }

    const record = await Attendance.findOneAndUpdate(
        { studentId: student._id, schoolId, date: startOfDay },
        { $set: updateFields },
        { upsert: true, new: true, runValidators: true }
    );

    // Step 4: Emit socket event for real-time dashboard updates
    try {
        const io = getIO();
        io.to(`school-${schoolId}`).emit("attendance-marked", {
            studentId: student._id,
            name: student.name,
            status,
            checkInTime: record.checkInTime
        });
    } catch (err) {
        logger.warn(`Socket emit failed: ${err.message}`);
    }

    logger.info(`Manual attendance: ${student.name} marked ${status} by ${markerUserId}`);

    return {
        studentId: student._id,
        name: student.name,
        status: record.status,
        markedBy: record.markedBy,
        checkInTime: record.checkInTime
    };
};

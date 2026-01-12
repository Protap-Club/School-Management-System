import Attendance from "../models/Attendance.model.js";
import User from "../models/User.model.js";
import Institute from "../models/Institute.model.js";

export const markAttendance = async (req, res) => {
    try {
        const { date, attendanceData } = req.body;
        const teacher = req.user;

        if (!teacher.instituteId) {
            return res.status(400).json({ success: false, message: "Teacher must belong to an institute" });
        }

        const institute = await Institute.findById(teacher.instituteId);
        if (!institute?.features?.attendance?.enabled) {
            return res.status(403).json({ success: false, message: "Attendance feature not enabled" });
        }

        if (!date || !attendanceData || !Array.isArray(attendanceData)) {
            return res.status(400).json({ success: false, message: "Date and attendance data required" });
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const results = [];
        const errors = [];

        for (const record of attendanceData) {
            try {
                const attendance = await Attendance.findOneAndUpdate(
                    { studentId: record.studentId, date: attendanceDate },
                    {
                        studentId: record.studentId,
                        instituteId: teacher.instituteId,
                        date: attendanceDate,
                        status: record.status,
                        markedBy: teacher._id,
                        remarks: record.remarks || ""
                    },
                    { upsert: true, new: true }
                );
                results.push(attendance);
            } catch (err) {
                errors.push({ studentId: record.studentId, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Attendance marked for ${results.length} students`,
            data: { saved: results.length, errors: errors.length },
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error("Mark Attendance Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.query;
        const teacher = req.user;

        if (!teacher.instituteId) {
            return res.status(400).json({ success: false, message: "Teacher must belong to an institute" });
        }

        const institute = await Institute.findById(teacher.instituteId);
        if (!institute?.features?.attendance?.enabled) {
            return res.status(403).json({ success: false, message: "Attendance feature not enabled" });
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.find({ instituteId: teacher.instituteId, date: attendanceDate })
            .populate('studentId', 'name email')
            .sort({ 'studentId.name': 1 });

        res.status(200).json({ success: true, data: attendance });
    } catch (error) {
        console.error("Get Attendance Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getStudentsForAttendance = async (req, res) => {
    try {
        const teacher = req.user;

        if (!teacher.instituteId) {
            return res.status(400).json({ success: false, message: "Teacher must belong to an institute" });
        }

        const institute = await Institute.findById(teacher.instituteId);
        if (!institute?.features?.attendance?.enabled) {
            return res.status(403).json({ success: false, message: "Attendance feature not enabled" });
        }

        const students = await User.find({
            instituteId: teacher.instituteId,
            role: 'student',
            isActive: true
        }).select('name email').sort({ name: 1 });

        res.status(200).json({ success: true, count: students.length, data: students });
    } catch (error) {
        console.error("Get Students Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkAttendanceAccess = async (req, res) => {
    try {
        const user = req.user;

        if (!user.instituteId) {
            return res.status(200).json({ success: true, enabled: false });
        }

        const institute = await Institute.findById(user.instituteId);
        const enabled = institute?.features?.attendance?.enabled || false;

        res.status(200).json({ success: true, enabled });
    } catch (error) {
        console.error("Check Attendance Access Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

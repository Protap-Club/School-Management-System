import mongoose from "mongoose";
import Attendance from "../attendance/Attendance.model.js";
import StudentProfile from "../user/model/StudentProfile.model.js";
import TeacherProfile from "../user/model/TeacherProfile.model.js";
import { USER_ROLES } from "../../constants/userRoles.js";
import logger from "../../config/logger.js";

/**
 * GET DASHBOARD STATS
 *
 * Returns aggregated attendance statistics without fetching individual user records.
 * Replaces the 2000-record student fetch previously done on the Dashboard.
 *
 * For admins/super_admins: returns all-school stats + per-class matrix
 * For teachers: returns stats scoped to their assigned classes only
 */
export const getDashboardStats = async (user) => {
    const rawSchoolId = user.schoolId?._id || user.schoolId;
    const schoolId = new mongoose.Types.ObjectId(rawSchoolId);

    // Build today's date range (midnight → now)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // ── Teacher class filter ──────────────────────────────────────
    // Teachers only see stats for their assigned classes
    let classFilter = null; // null = no filter (admin sees all)
    if (user.role === USER_ROLES.TEACHER) {
        const profile = await TeacherProfile.findOne({
            userId: user._id,
            schoolId: rawSchoolId,
        })
            .select("assignedClasses")
            .lean();

        const assignedClasses = profile?.assignedClasses || [];
        if (assignedClasses.length === 0) {
            // Teacher has no assigned classes — return empty stats
            return {
                totalStudents: 0,
                todayAttendance: { present: 0, absent: 0, late: 0 },
                classMatrix: [],
            };
        }
        classFilter = assignedClasses.map((c) => ({
            standard: c.standard,
            section: c.section,
        }));
    }

    // ── Query 1: Student counts per class ─────────────────────────
    // Uses StudentProfile (lightweight — no password, tokens, etc.)
    const studentMatchStage = { schoolId };
    if (classFilter) {
        studentMatchStage.$or = classFilter;
    }

    const studentCountsRaw = await StudentProfile.aggregate([
        { $match: studentMatchStage },
        {
            $group: {
                _id: { standard: "$standard", section: "$section" },
                count: { $sum: 1 },
            },
        },
    ]);

    // Build a map: "standard::section" → total students
    const studentCountMap = new Map(
        studentCountsRaw.map((row) => [
            `${row._id.standard}::${row._id.section}`,
            row.count,
        ])
    );

    const totalStudents = studentCountsRaw.reduce((sum, row) => sum + row.count, 0);

    // ── Query 2: Today's attendance counts per class ──────────────
    // Uses the new compound index { schoolId, date } — fast scan
    const attendancePipeline = [
        {
            $match: {
                schoolId,
                date: { $gte: startOfDay },
            },
        },
        // Join with StudentProfile to get class info
        {
            $lookup: {
                from: "studentprofiles",
                localField: "studentId",
                foreignField: "userId",
                as: "profile",
                pipeline: [{ $project: { standard: 1, section: 1 } }],
            },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: false } },
        // Apply teacher class filter if needed
        ...(classFilter
            ? [{ $match: { $or: classFilter.map((c) => ({ "profile.standard": c.standard, "profile.section": c.section })) } }]
            : []),
        {
            $group: {
                _id: {
                    standard: "$profile.standard",
                    section: "$profile.section",
                    status: "$status",
                },
                count: { $sum: 1 },
            },
        },
    ];

    const attendanceRows = await Attendance.aggregate(attendancePipeline);

    // Build attendance map: "standard::section::status" → count
    const attendanceMap = new Map();
    for (const row of attendanceRows) {
        const key = `${row._id.standard}::${row._id.section}::${row._id.status}`;
        attendanceMap.set(key, row.count);
    }

    // ── Build class matrix ────────────────────────────────────────
    // Collect all class keys from student counts (source of truth for configured classes)
    const allClassKeys = Array.from(studentCountMap.keys());

    const classMatrix = allClassKeys
        .map((classKey) => {
            const [standard, section] = classKey.split("::");
            const total = studentCountMap.get(classKey) || 0;
            const present = attendanceMap.get(`${classKey}::Present`) || 0;
            const late = attendanceMap.get(`${classKey}::Late`) || 0;
            const absent = Math.max(0, total - present - late);
            const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

            return { standard, section, total, present, late, absent, rate };
        })
        .sort((a, b) => {
            const stdDiff = parseInt(a.standard) - parseInt(b.standard);
            return stdDiff !== 0 ? stdDiff : a.section.localeCompare(b.section);
        });

    // ── Overall totals ────────────────────────────────────────────
    const overallPresent = classMatrix.reduce((s, c) => s + c.present, 0);
    const overallLate = classMatrix.reduce((s, c) => s + c.late, 0);
    const overallAbsent = Math.max(0, totalStudents - overallPresent - overallLate);

    logger.debug({ userId: user._id, role: user.role }, "Dashboard stats computed");

    return {
        totalStudents,
        todayAttendance: {
            present: overallPresent,
            late: overallLate,
            absent: overallAbsent,
        },
        classMatrix,
    };
};

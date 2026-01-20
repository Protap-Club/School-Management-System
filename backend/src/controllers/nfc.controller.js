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
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           🏷️  NFC ATTENDANCE REQUEST RECEIVED                ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log("📅 Timestamp:", new Date().toISOString());
    console.log("🌐 Request IP:", req.ip || req.connection?.remoteAddress);
    console.log("📋 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("────────────────────────────────────────────────────────────────");

    try {
        console.log("\n📦 [LOG 2] REQUEST BODY CHECK:");
        console.log("   └── Content-Type:", req.headers['content-type']);
        console.log("   └── req.body (raw):", req.body);
        console.log("   └── req.body (stringified):", JSON.stringify(req.body));
        console.log("   └── typeof req.body:", typeof req.body);

        // Handle case where body might be a string (if Content-Type wasn't set properly)
        let parsedBody = req.body;
        if (typeof req.body === 'string') {
            console.log("   └── Body is a string, attempting to parse as JSON...");
            try {
                parsedBody = JSON.parse(req.body);
                console.log("   └── Parsed body:", parsedBody);
            } catch (parseError) {
                console.log("   └── Failed to parse body as JSON:", parseError.message);
            }
        }

        // Also check if body is empty object but we have a query param
        const nfcUid = parsedBody?.nfcUid || req.query?.nfcUid;

        console.log("   └── Final nfcUid value:", nfcUid);
        console.log("   └── nfcUid type:", typeof nfcUid);
        console.log("────────────────────────────────────────────────────────────────");

        if (!nfcUid) {
            console.log("❌ [ERROR] nfcUid is missing or empty!");
            console.log("   └── HINT: Make sure HTTP Shortcuts sends:");
            console.log("       Header: Content-Type: application/json");
            console.log("       Body: {\"nfcUid\": \"YOUR_TAG_ID\"}");
            return res.status(400).json({
                success: false,
                message: "nfcUid is required"
            });
        }

        // Find user by NFC UID
        console.log("\n🔍 [LOG 3] USER LOOKUP:");
        console.log("   └── Searching for user with nfcUid:", nfcUid.trim());

        const student = await User.findOne({ nfcUid: nfcUid.trim() });

        console.log("   └── User lookup result:", student ? "✅ FOUND" : "❌ NOT FOUND");
        if (student) {
            console.log("   └── Student ID:", student._id);
            console.log("   └── Student Name:", student.name);
            console.log("   └── Student School ID:", student.schoolId);
            console.log("   └── Student Role:", student.role);
        } else {
            console.log("   └── No user found with this NFC UID in database");
        }
        console.log("────────────────────────────────────────────────────────────────");

        if (!student) {
            console.log("❌ [RESULT] TAG_NOT_REGISTERED - Returning 404");
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
        console.log("\n🔄 [LOG 4] DUPLICATE CHECK:");
        console.log("   └── Checking attendance for date:", today.toISOString());
        console.log("   └── Student ID:", student._id);

        const existingAttendance = await Attendance.findOne({
            studentId: student._id,
            date: today
        });

        console.log("   └── Existing attendance:", existingAttendance ? "⚠️ ALREADY MARKED" : "✅ NO DUPLICATE");
        if (existingAttendance) {
            console.log("   └── Existing record ID:", existingAttendance._id);
            console.log("   └── Check-in Time:", existingAttendance.checkInTime);
        }
        console.log("────────────────────────────────────────────────────────────────");

        if (existingAttendance) {
            console.log("⚠️ [RESULT] ALREADY_MARKED - Returning 409");
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
        console.log("\n📝 Creating new attendance record...");
        const attendance = new Attendance({
            studentId: student._id,
            schoolId: student.schoolId,
            date: today,
            status: "Present",
            checkInTime: new Date(),
            markedBy: "NFC"
        });

        await attendance.save();
        console.log("✅ Attendance record saved with ID:", attendance._id);

        // Emit Socket.io event to school room
        // IMPORTANT: Convert schoolId to string for consistent room naming
        const schoolIdStr = student.schoolId.toString();
        console.log("\n📡 Emitting Socket.io event:");
        console.log("   └── Room name: school-" + schoolIdStr);
        console.log("   └── Event: attendance-marked");
        console.log("   └── Payload:", JSON.stringify({
            studentId: student._id.toString(),
            studentName: student.name,
            status: "Present",
            checkInTime: attendance.checkInTime
        }));

        const io = getIO();
        io.to(`school-${schoolIdStr}`).emit("attendance-marked", {
            studentId: student._id.toString(),
            studentName: student.name,
            status: "Present",
            checkInTime: attendance.checkInTime
        });

        console.log("\n╔══════════════════════════════════════════════════════════════╗");
        console.log("║         ✅ [LOG 5] SUCCESS - ATTENDANCE MARKED!              ║");
        console.log("╚══════════════════════════════════════════════════════════════╝");
        console.log("   └── Student:", student.name);
        console.log("   └── Check-in Time:", attendance.checkInTime);
        console.log("   └── Response: 201 Created");
        console.log("\n");

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
        console.log("\n╔══════════════════════════════════════════════════════════════╗");
        console.log("║           ❌ [LOG 5] ERROR - ATTENDANCE FAILED!              ║");
        console.log("╚══════════════════════════════════════════════════════════════╝");
        console.error("   └── Error Name:", error.name);
        console.error("   └── Error Message:", error.message);
        console.error("   └── Stack Trace:", error.stack);
        console.log("\n");

        return res.status(500).json({
            success: false,
            message: "Failed to mark attendance"
        });
    }
};

export { linkTag, markAttendance };

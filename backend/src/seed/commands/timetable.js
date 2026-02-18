/**
 * ═══════════════════════════════════════════════════════════════
 * TIMETABLE SEED - Delhi Public School (DPS)
 * ═══════════════════════════════════════════════════════════════
 *
 * Seeds realistic timetable data for DPS school.
 * 8 periods per day | Mon–Sat | Academic Year 2024
 *
 * PRIMARY TEST USER: Priya Sharma (priya@dps.com) — Class Teacher 10-A
 * She teaches Math across 10-A, 11-A, 12-A
 *
 * OTHER TEACHERS ALSO SEEDED so 10-A has a full timetable:
 *   Amit Verma     → English
 *   Neha Gupta     → Science / Physics
 *   Rahul Singh    → Hindi / History
 *   Kavita Patel   → Chemistry
 *   Vikram Reddy   → Computer Science
 *   Sunita Iyer    → Biology / Geography
 *   Arjun Malhotra → PE / Drawing
 * ═══════════════════════════════════════════════════════════════
 */


import { TimeSlot, Timetable, TimetableEntry, DAYS_OF_WEEK } from "../../module/timetable/Timetable.model.js";


// ── helpers ────────────────────────────────────────────────────
// Removed toMins helper since we now use literal 12-hour strings

// ═══════════════════════════════════════════════════════════════
// 1. TIME SLOTS  (DPS bell schedule)
// ═══════════════════════════════════════════════════════════════

const TIME_SLOTS_DATA = [
    { slotNumber: 1, startTime: "09 : 00 AM", endTime: "09 : 30 AM", slotType: "CLASS" },
    { slotNumber: 2, startTime: "09 : 30 AM", endTime: "10 : 00 AM", slotType: "CLASS" },
    { slotNumber: 3, startTime: "10 : 00 AM", endTime: "10 : 30 AM", slotType: "CLASS" },
    { slotNumber: 4, startTime: "10 : 30 AM", endTime: "10 : 45 AM", slotType: "BREAK" }, // short break
    { slotNumber: 5, startTime: "10 : 45 AM", endTime: "11 : 15 AM", slotType: "CLASS" },
    { slotNumber: 6, startTime: "11 : 15 AM", endTime: "11 : 45 AM", slotType: "CLASS" },
    { slotNumber: 7, startTime: "11 : 45 AM", endTime: "12 : 15 PM", slotType: "CLASS" },
    { slotNumber: 8, startTime: "12 : 15 PM", endTime: "12 : 45 PM", slotType: "BREAK" }, // lunch
    { slotNumber: 9, startTime: "12 : 45 PM", endTime: "01 : 20 PM", slotType: "CLASS" },
    { slotNumber: 10, startTime: "01 : 20 PM", endTime: "02 : 00 PM", slotType: "CLASS" },
];

// ═══════════════════════════════════════════════════════════════
// 2. TIMETABLES  (one per class)
// ═══════════════════════════════════════════════════════════════

// We seed 10-A fully. Other classes partially (just enough for Priya's entries).
const TIMETABLES_DATA = [
    { standard: "10th", section: "A", academicYear: 2024 },
    { standard: "10th", section: "B", academicYear: 2024 },
    { standard: "11th", section: "A", academicYear: 2024 },
    { standard: "12th", section: "A", academicYear: 2024 },
];

// ═══════════════════════════════════════════════════════════════
// 3. TEACHER → SUBJECT MAP  (realistic Indian school curriculum)
// ═══════════════════════════════════════════════════════════════

// These emails match DEMO_USERS so lookups will find real User documents
const TEACHER_SUBJECTS = {
    "priya@dps.com": "Mathematics",
    "amit@dps.com": "English",
    "neha@dps.com": "Physics",
    "rahul@dps.com": "History",
    "kavita@dps.com": "Chemistry",
    "vikram@dps.com": "Computer Science",
    "sunita.i@dps.com": "Biology",
    "arjun@dps.com": "Physical Education",
};

// ═══════════════════════════════════════════════════════════════
// 4. TIMETABLE ENTRIES
//
//  Format:  [ teacherEmail, classKey, dayOfWeek, slotNumber, room ]
//  classKey → "10-A" | "10-B" | "11-A" | "12-A"
//
//  Rules applied (realistic):
//   • No teacher appears twice in the same day+slot
//   • Priya (Math) teaches 10-A, 11-A, 12-A  — 5 periods/week each
//   • Break slots (4, 8) are never assigned
//   • 10-A has ALL slots filled Mon–Fri, Sat is half-day (slots 1–5)
// ═══════════════════════════════════════════════════════════════

// prettier-ignore
const ENTRIES_RAW = [

    // ────────────────────────────────────────────────────────────
    // CLASS 10-A  (Priya is class teacher)
    // Full timetable so API returns a complete weekly schedule
    // ────────────────────────────────────────────────────────────

    // MONDAY
    ["priya@dps.com", "10-A", "Mon", 1, "Room 14"],
    ["amit@dps.com", "10-A", "Mon", 2, "Room 14"],
    ["neha@dps.com", "10-A", "Mon", 3, "Room 14"],
    // slot 4 = BREAK
    ["kavita@dps.com", "10-A", "Mon", 5, "Room 14"],
    ["rahul@dps.com", "10-A", "Mon", 6, "Room 14"],
    ["vikram@dps.com", "10-A", "Mon", 7, "Lab 2"],
    // slot 8 = LUNCH
    ["sunita.i@dps.com", "10-A", "Mon", 9, "Room 14"],
    ["arjun@dps.com", "10-A", "Mon", 10, "Ground"],

    // TUESDAY
    ["amit@dps.com", "10-A", "Tue", 1, "Room 14"],
    ["priya@dps.com", "10-A", "Tue", 2, "Room 14"],
    ["rahul@dps.com", "10-A", "Tue", 3, "Room 14"],
    // slot 4 = BREAK
    ["neha@dps.com", "10-A", "Tue", 5, "Lab 1"],
    ["kavita@dps.com", "10-A", "Tue", 6, "Lab 1"],
    ["priya@dps.com", "10-A", "Tue", 7, "Room 14"],
    // slot 8 = LUNCH
    ["sunita.i@dps.com", "10-A", "Tue", 9, "Room 14"],
    ["vikram@dps.com", "10-A", "Tue", 10, "Lab 2"],

    // WEDNESDAY
    ["neha@dps.com", "10-A", "Wed", 1, "Lab 1"],
    ["sunita.i@dps.com", "10-A", "Wed", 2, "Room 14"],
    ["priya@dps.com", "10-A", "Wed", 3, "Room 14"],
    // slot 4 = BREAK
    ["amit@dps.com", "10-A", "Wed", 5, "Room 14"],
    ["rahul@dps.com", "10-A", "Wed", 6, "Room 14"],
    ["kavita@dps.com", "10-A", "Wed", 7, "Lab 1"],
    // slot 8 = LUNCH
    ["vikram@dps.com", "10-A", "Wed", 9, "Lab 2"],
    ["arjun@dps.com", "10-A", "Wed", 10, "Ground"],

    // THURSDAY
    ["priya@dps.com", "10-A", "Thu", 1, "Room 14"],
    ["kavita@dps.com", "10-A", "Thu", 2, "Lab 1"],
    ["amit@dps.com", "10-A", "Thu", 3, "Room 14"],
    // slot 4 = BREAK
    ["sunita.i@dps.com", "10-A", "Thu", 5, "Room 14"],
    ["priya@dps.com", "10-A", "Thu", 6, "Room 14"],
    ["rahul@dps.com", "10-A", "Thu", 7, "Room 14"],
    // slot 8 = LUNCH
    ["neha@dps.com", "10-A", "Thu", 9, "Lab 1"],
    ["vikram@dps.com", "10-A", "Thu", 10, "Lab 2"],

    // FRIDAY
    ["rahul@dps.com", "10-A", "Fri", 1, "Room 14"],
    ["priya@dps.com", "10-A", "Fri", 2, "Room 14"],
    ["sunita.i@dps.com", "10-A", "Fri", 3, "Room 14"],
    // slot 4 = BREAK
    ["amit@dps.com", "10-A", "Fri", 5, "Room 14"],
    ["neha@dps.com", "10-A", "Fri", 6, "Lab 1"],
    ["arjun@dps.com", "10-A", "Fri", 7, "Ground"],
    // slot 8 = LUNCH
    ["kavita@dps.com", "10-A", "Fri", 9, "Lab 1"],
    ["vikram@dps.com", "10-A", "Fri", 10, "Lab 2"],

    // SATURDAY  (half-day: slots 1–5 only, slot 4 still break)
    ["priya@dps.com", "10-A", "Sat", 1, "Room 14"],
    ["amit@dps.com", "10-A", "Sat", 2, "Room 14"],
    ["rahul@dps.com", "10-A", "Sat", 3, "Room 14"],
    // slot 4 = BREAK
    ["neha@dps.com", "10-A", "Sat", 5, "Lab 1"],

    // ────────────────────────────────────────────────────────────
    // CLASS 11-A  (Priya teaches Math here too)
    // Only Priya's Math slots seeded for brevity
    // ────────────────────────────────────────────────────────────
    ["priya@dps.com", "11-A", "Mon", 3, "Room 22"],
    ["priya@dps.com", "11-A", "Mon", 7, "Room 22"],
    ["priya@dps.com", "11-A", "Tue", 5, "Room 22"],
    ["priya@dps.com", "11-A", "Wed", 1, "Room 22"],
    ["priya@dps.com", "11-A", "Wed", 9, "Room 22"],
    ["priya@dps.com", "11-A", "Thu", 3, "Room 22"],
    ["priya@dps.com", "11-A", "Fri", 6, "Room 22"],
    ["priya@dps.com", "11-A", "Fri", 10, "Room 22"],
    ["priya@dps.com", "11-A", "Sat", 2, "Room 22"],

    // ────────────────────────────────────────────────────────────
    // CLASS 12-A  (Priya teaches Math here too)
    // ────────────────────────────────────────────────────────────
    ["priya@dps.com", "12-A", "Mon", 5, "Room 30"],
    ["priya@dps.com", "12-A", "Mon", 9, "Room 30"],
    ["priya@dps.com", "12-A", "Tue", 1, "Room 30"],
    ["priya@dps.com", "12-A", "Wed", 6, "Room 30"],
    ["priya@dps.com", "12-A", "Thu", 9, "Room 30"],
    ["priya@dps.com", "12-A", "Fri", 3, "Room 30"],
    ["priya@dps.com", "12-A", "Fri", 7, "Room 30"],
    ["priya@dps.com", "12-A", "Sat", 3, "Room 30"],
];

// ═══════════════════════════════════════════════════════════════
// 5. SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

const seed = async () => {
    // await mongoose.connect(process.env.MONGO_URI); // Managed by index.js
    // console.log("✅  Connected to MongoDB");


    // ── 0. Wipe previous timetable data ──────────────────────────
    await TimetableEntry.deleteMany({});
    await Timetable.deleteMany({});
    await TimeSlot.deleteMany({});
    console.log("🗑️   Cleared old timetable data");

    // ── 1. Find the DPS school ────────────────────────────────────
    // Import School model from wherever it lives in your project
    const { default: School } = await import("../../module/school/School.model.js");
    const school = await School.findOne({ code: "DPS" }).lean();
    if (!school) throw new Error("DPS school not found — run the main demo seed first");
    const schoolId = school._id;
    console.log(`🏫  Found school: ${school.name} (${schoolId})`);

    // ── 2. Find all relevant teachers ────────────────────────────
    const { default: User } = await import("../../module/user/model/User.model.js");
    const teacherEmails = Object.keys(TEACHER_SUBJECTS);
    const teachers = await User.find({ email: { $in: teacherEmails } }).lean();

    if (teachers.length === 0) throw new Error("No teachers found — run the main demo seed first");

    // email → { _id, subject }
    const teacherMap = {};
    teachers.forEach(t => {
        teacherMap[t.email] = {
            _id: t._id,
            subject: TEACHER_SUBJECTS[t.email],
        };
    });
    console.log(`👩‍🏫  Loaded ${teachers.length} teachers`);

    // ── 3. Insert TimeSlots ───────────────────────────────────────
    const insertedSlots = await TimeSlot.insertMany(
        TIME_SLOTS_DATA.map(s => ({ ...s, schoolId }))
    );

    // slotNumber → ObjectId
    const slotMap = {};
    insertedSlots.forEach(s => { slotMap[s.slotNumber] = s._id; });
    console.log(`🕐  Inserted ${insertedSlots.length} time slots`);

    // ── 4. Insert Timetables ──────────────────────────────────────
    const insertedTimetables = await Timetable.insertMany(
        TIMETABLES_DATA.map(t => ({ ...t, schoolId }))
    );

    // "10-A" → ObjectId
    const timetableMap = {};
    insertedTimetables.forEach(tt => {
        const key = `${tt.standard.replace("th", "")}-${tt.section}`; // "10-A"
        timetableMap[key] = tt._id;
    });
    console.log(`📋  Inserted ${insertedTimetables.length} timetables`);

    // ── 5. Build & insert TimetableEntries ───────────────────────
    const entries = [];
    const seen = new Set(); // guard against duplicates

    // Auto-populate BREAK slots for all timetables
    const breakSlots = insertedSlots.filter(s => s.slotType === "BREAK");
    for (const tt of insertedTimetables) {
        for (const day of DAYS_OF_WEEK) {
            for (const slot of breakSlots) {
                entries.push({
                    schoolId,
                    timetableId: tt._id,
                    dayOfWeek: day,
                    timeSlotId: slot._id,
                    subject: slot.endTime === "12 : 45 PM" ? "Lunch" : "Break", // Hardcoded heuristics based on TIME_SLOTS_DATA
                    roomNumber: "N/A"
                });
                seen.add(`${tt._id}-${day}-${slot._id}`);
            }
        }
    }

    for (const [email, classKey, day, slot, room] of ENTRIES_RAW) {
        const teacher = teacherMap[email];
        const timetableId = timetableMap[classKey];
        const timeSlotId = slotMap[slot];

        if (!teacher) { console.warn(`⚠️  Teacher not found: ${email}`); continue; }
        if (!timetableId) { console.warn(`⚠️  Timetable not found: ${classKey}`); continue; }
        if (!timeSlotId) { console.warn(`⚠️  Slot not found: ${slot}`); continue; }

        // Skip break slots silently
        const slotData = TIME_SLOTS_DATA.find(s => s.slotNumber === slot);
        if (slotData?.slotType === "BREAK") continue;

        // Prevent duplicate (timetableId + day + slot) — schema unique index would catch it anyway
        const dedupKey = `${timetableId}-${day}-${slot}`;
        if (seen.has(dedupKey)) {
            console.warn(`⚠️  Duplicate skipped: ${classKey} ${day} slot ${slot}`);
            continue;
        }
        seen.add(dedupKey);

        entries.push({
            schoolId,
            timetableId,
            dayOfWeek: day,
            timeSlotId,
            subject: teacher.subject,
            teacherId: teacher._id,
            roomNumber: room,
        });
    }

    await TimetableEntry.insertMany(entries);
    console.log(`📝  Inserted ${entries.length} timetable entries`);

    // ── 6. Summary ────────────────────────────────────────────────
    const priya = teachers.find(t => t.email === "priya@dps.com");
    if (priya) {
        const priyaCount = entries.filter(
            e => String(e.teacherId) === String(priya._id)
        ).length;
        console.log(`\n📊  Priya Sharma (priya@dps.com) has ${priyaCount} periods across the week`);
        console.log(`    Classes: 10-A, 11-A, 12-A  |  Subject: Mathematics`);
    }

    console.log("\n✅  Timetable seed complete!\n");
    console.log("Test with:");
    console.log("  GET /api/timetable/user/:priyaId?role=TEACHER&schoolId=<dpsId>\n");

    // await mongoose.disconnect(); // Managed by index.js
};

// Removed standalone execution to prevent double-run when imported by index.js
// seed().catch(err => {
//     console.error("❌  Seed failed:", err.message);
//     process.exit(1);
// });


export default seed;
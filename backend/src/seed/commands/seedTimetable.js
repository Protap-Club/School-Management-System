// Seeds time slots, timetable headers, and entries from timetable.json
import { createRequire } from "module";
import { TimeSlot, Timetable, TimetableEntry } from "../../module/timetable/Timetable.model.js";
import User from "../../module/user/model/User.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const ttData = require("../data/timetable.json");

const seedTimetable = async () => {
    logger.info("═══ Seeding Timetable ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    // Clear existing timetable data for this school
    await TimeSlot.deleteMany({ schoolId: school._id });
    const oldTTs = await Timetable.find({ schoolId: school._id }).select("_id");
    const oldTTIds = oldTTs.map(t => t._id);
    await TimetableEntry.deleteMany({ timetableId: { $in: oldTTIds } });
    await Timetable.deleteMany({ schoolId: school._id });

    // Time slots (bell schedule)
    const slots = ttData.timeSlots.map(s => ({ ...s, schoolId: school._id }));
    const createdSlots = await TimeSlot.insertMany(slots);
    logger.info(`Time slots → ${createdSlots.length}`);

    // Build slotNumber → _id lookup
    const slotMap = {};
    createdSlots.forEach(s => { slotMap[s.slotNumber] = s._id; });

    // Timetable headers (one per class-section)
    const timetables = ttData.timetables.map(t => ({ ...t, schoolId: school._id }));
    const createdTTs = await Timetable.insertMany(timetables);
    logger.info(`Timetables → ${createdTTs.length}`);

    // Build "standard-section" → _id lookup
    const ttMap = {};
    createdTTs.forEach(t => { ttMap[`${t.standard}-${t.section}`] = t._id; });

    // Resolve teacher emails → userId
    const teacherEmails = [...new Set(ttData.entries.map(e => e.teacherEmail))];
    const teachers = await User.find({ email: { $in: teacherEmails }, schoolId: school._id }).select("_id email");
    const teacherMap = {};
    teachers.forEach(t => { teacherMap[t.email] = t._id; });

    // Create timetable entries
    const entries = [];
    for (const e of ttData.entries) {
        const teacherId = teacherMap[e.teacherEmail];
        const timetableId = ttMap[e.class];
        const timeSlotId = slotMap[e.slot];
        if (!teacherId || !timetableId || !timeSlotId) {
            logger.warn(`Skipping entry: teacher=${e.teacherEmail} class=${e.class} slot=${e.slot}`);
            continue;
        }

        // Get subject from teacherSubjects map
        const subject = ttData.teacherSubjects[e.teacherEmail] || "Unknown";

        entries.push({
            timetableId,
            schoolId: school._id,
            dayOfWeek: e.day,
            timeSlotId,
            subject,
            teacherId,
            roomNumber: e.room,
        });
    }

    if (entries.length > 0) await TimetableEntry.insertMany(entries);
    logger.info(`Timetable entries → ${entries.length}`);
};

export default seedTimetable;

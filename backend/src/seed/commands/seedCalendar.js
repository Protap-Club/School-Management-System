// Seeds calendar events (holidays, exams, school events) from calendar.json
import { createRequire } from "module";
import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import School from "../../module/school/School.model.js";
import logger from "../../config/logger.js";

const require = createRequire(import.meta.url);
const calData = require("../data/calendar.json");

const seedCalendar = async () => {
    logger.info("═══ Seeding Calendar ═══");

    const school = await School.findOne({ code: "NV" });
    if (!school) throw new Error("School not found. Run seed-school first.");

    await CalendarEvent.deleteMany({ schoolId: school._id });

    const events = calData.events.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        schoolId: school._id,
        createdBy: null,
    }));

    await CalendarEvent.insertMany(events);
    logger.info(`Calendar events → ${events.length}`);
};

export default seedCalendar;

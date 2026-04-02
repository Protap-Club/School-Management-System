import { CalendarEvent } from "../../module/calendar/calendar.model.js";
import School from "../../module/school/School.model.js";
import User from "../../module/user/model/User.model.js";
import logger from "../../config/logger.js";
import { loadSeedJson } from "../lib/loadJson.js";

const calData = loadSeedJson("calendar.json");
const { schools: schoolsDef } = loadSeedJson("schools.json");

const seedCalendar = async () => {
  logger.info("=== Seeding Calendar ===");

  for (const schoolDef of schoolsDef) {
    const school = await School.findOne({ code: schoolDef.code });
    if (!school) continue;

    const admin = await User.findOne({ schoolId: school._id, role: "admin" }).select("_id");
    await CalendarEvent.deleteMany({ schoolId: school._id });

    const events = calData.events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
      targetAudience: "all",
      targetClasses: [],
      schoolId: school._id,
      createdBy: admin?._id || null,
    }));

    if (events.length) {
      await CalendarEvent.insertMany(events);
    }
    logger.info(`[${schoolDef.code}] Calendar events seeded: ${events.length}`);
  }
};

export default seedCalendar;

// Runs all Navrachna seed commands in dependency order
import seedSchool from "./seedSchool.js";
import seedUsers from "./seedUsers.js";
import seedProfiles from "./seedProfiles.js";
import seedTimetable from "./seedTimetable.js";
import seedAttendance from "./seedAttendance.js";
import seedCalendar from "./seedCalendar.js";
import seedNotices from "./seedNotices.js";
import logger from "../../config/logger.js";

const seedAll = async () => {
    logger.info("═══════════════════════════════════════════");
    logger.info("  FULL SEED — Navrachna International School");
    logger.info("═══════════════════════════════════════════");

    const start = Date.now();

    // Order matters: school → users → profiles → rest
    await seedSchool();
    await seedUsers();
    await seedProfiles();
    await seedTimetable();
    await seedAttendance();
    await seedCalendar();
    await seedNotices();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    logger.info("═══════════════════════════════════════════");
    logger.info(`  DONE — ${elapsed}s total`);
    logger.info("═══════════════════════════════════════════");
};

export default seedAll;

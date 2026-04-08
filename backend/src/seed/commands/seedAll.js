import cleanup from "./cleanup.js";
import seedSchool from "./seedSchool.js";
import seedUsers from "./seedUsers.js";
import seedProfiles from "./seedProfiles.js";
import seedTimetable from "./seedTimetable.js";
import seedAttendance from "./seedAttendance.js";
import seedCalendar from "./seedCalendar.js";
import seedNotices from "./seedNotices.js";
import seedAssignments from "./seedAssignments.js";
import seedExaminations from "./seedExaminations.js";
import seedResults from "./seedResults.js";
import logger from "../../config/logger.js";

const seedAll = async () => {
    logger.info("═══════════════════════════════════════════");
    logger.info("  FULL SEED — 3 Schools (JNV, NV, AV)");
    logger.info("═══════════════════════════════════════════");

    const start = Date.now();

    // Always clean old seed data first to prevent duplicate key errors
    await cleanup();

    // Order matters: school → users → profiles → rest
    await seedSchool();
    await seedUsers();
    await seedProfiles();
    await seedTimetable();
    await seedAttendance();
    await seedCalendar();
    await seedNotices();
    await seedAssignments();
    await seedExaminations();
    await seedResults();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    logger.info("═══════════════════════════════════════════");
    logger.info(`  DONE — ${elapsed}s total`);
    logger.info("═══════════════════════════════════════════");
};

export default seedAll;

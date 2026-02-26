// Seed CLI — run `node src/seed/index.js <command>` or `node src/seed/index.js help`
import { connectDB, disconnectDB } from "./lib/db.js";
import logger from "../config/logger.js";

// Available commands mapped to their module loaders
const commands = {
    // Navrachna seed commands (use seed-all to run everything)
    "seed-all": () => import("./commands/seedAll.js"),
    "seed-school": () => import("./commands/seedSchool.js"),
    "seed-users": () => import("./commands/seedUsers.js"),
    "seed-profiles": () => import("./commands/seedProfiles.js"),
    "seed-timetable": () => import("./commands/seedTimetable.js"),
    "seed-attendance": () => import("./commands/seedAttendance.js"),
    "seed-calendar": () => import("./commands/seedCalendar.js"),
    "seed-notices": () => import("./commands/seedNotices.js"),
    "cleanup": () => import("./commands/cleanup.js"),
};

const showHelp = () => {
    logger.info(`
═══════════════════════════════════════════════════════════
  Seed CLI — Database Seeding Tool
═══════════════════════════════════════════════════════════

USAGE:
  node src/seed/index.js <command>

COMMANDS:
  seed-all            Runs ALL seed commands below in order (one-shot full setup)
  seed-school         Creates the Navrachna school
  seed-users          Creates super admin, admins, teachers, 1080 students
  seed-profiles       Creates admin, teacher, and student profiles
  seed-timetable      Creates time slots, timetables, and timetable entries
  seed-attendance     Creates sample attendance for class 10-A
  seed-calendar       Creates holidays, exams, and school events
  seed-notices        Creates notices and notice groups
  cleanup             Removes ALL Navrachna data (run before re-seeding)
  help                Show this help message

DEPENDENCY ORDER (if running individually):
  seed-school → seed-users → seed-profiles → seed-timetable / seed-attendance / seed-calendar / seed-notices

DEFAULT PASSWORD: Demo@123  (for all seeded users)
═══════════════════════════════════════════════════════════
`);
};

const main = async () => {
    const args = process.argv.slice(2);
    const commandName = args[0]?.toLowerCase();

    if (!commandName || commandName === "help") {
        showHelp();
        return;
    }

    if (!commands[commandName]) {
        logger.error(`Unknown command: "${commandName}"`);
        showHelp();
        return;
    }

    try {
        await connectDB();

        const mod = await commands[commandName]();
        if (typeof mod.default === "function") {
            await mod.default(args.slice(1));
        } else {
            logger.error(`Command "${commandName}" did not export a default function.`);
        }
    } catch (error) {
        logger.error(`Error in "${commandName}": ${error.message}`);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
};

main();

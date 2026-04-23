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
    "seed-assignments": () => import("./commands/seedAssignments.js"),
    "seed-examinations": () => import("./commands/seedExaminations.js"),
    "seed-results": () => import("./commands/seedResults.js"),
    "cleanup": () => import("./commands/cleanup.js"),
    "nfc": () => import("./commands/nfc.js"),
    "seed-financials": () => import("./commands/seedFinancials.js"),

};

const showHelp = () => {
    logger.info(`
═══════════════════════════════════════════════════════════
  Seed CLI — Multi-School Database Seeding Tool
═══════════════════════════════════════════════════════════

USAGE:
  node src/seed/index.js <command>

SCHOOLS:  JNV (Jawahar Navodaya Vidyalaya)
          NV  (Navrachna International School)
          AV  (Ambe Vidyalaya)

COMMANDS:
  seed-all            Runs ALL seed commands below in order (one-shot full setup)
  seed-school         Creates all 3 schools from schools.json
  seed-users          Creates super admin, admins, teachers, and students per school
  seed-profiles       Creates admin, teacher, and student profiles per school
  seed-timetable      Creates time slots, timetables, and timetable entries per school
  seed-attendance     Creates realistic attendance for all seeded students
  seed-calendar       Creates holidays, exams, and school events per school
  seed-notices        Creates notices per school
  seed-assignments    Creates assignment records per class with future due dates
  seed-examinations   Creates class tests and term exams per class
  seed-results        Generates realistic Gaussian marks for completed exams
  cleanup             Removes ALL seeded school data (run before re-seeding)
  help                Show this help message

DEPENDENCY ORDER (if running individually):
  seed-school → seed-users → seed-profiles → seed-timetable / seed-attendance / seed-calendar / seed-notices

DEFAULT PASSWORD: School@123  (for all seeded users)
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

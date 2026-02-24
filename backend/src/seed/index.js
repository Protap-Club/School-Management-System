#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * Seed Manager - Centralized Database Seeding & Utility CLI
 * ═══════════════════════════════════════════════════════════════
 *
 * This script provides a command-line interface for managing various
 * database seeding and maintenance tasks. It connects to the database,
 * dispatches commands, and ensures proper disconnection.
 *
 * Commands are dynamically loaded from the './commands' directory.
 *
 * Usage:
 *   node src/seed/index.js <command> [options]
 *
 * Examples:
 *   node src/seed/index.js demo
 *   node src/seed/index.js quick
 *   node src/seed/index.js cleanup
 *   node src/seed/index.js clear-attendance
 *   node src/seed/index.js create-student --name "Vraj" --email "vraj@test.com" --nfc "12345"
 *   node src/seed/index.js help
 * ═══════════════════════════════════════════════════════════════
 */

import { connectDB, disconnectDB } from "./lib/db.js"; // Database connection utilities
import logger from "../config/logger.js"; // Centralized application logger

// --- Dynamic Command Loader ---
// Map of available commands and their corresponding module paths.
// This allows for easy extension by adding new files to the 'commands' directory.
const commands = {
    // Core seeding commands
    "demo": () => import("./commands/demo.js"),
    "quick": () => import("./commands/quick.js"),
    "cleanup": () => import("./commands/cleanup.js"),
    "holidays": () => import("./commands/holidays.js"),
    "timetable": () => import("./commands/timetable.js"),

    // Utility commands
    "clear-attendance": () => import("./commands/clearAttendance.js"),
    "create-student": () => import("./commands/createStudent.js"),
    "nfc": () => import("./commands/nfc.js"),
};

/**
 * Displays the help message for the CLI.
 */
const showHelp = () => {
    logger.info(`
═══════════════════════════════════════════════════════════════
🌱 Seed Manager - Database Seeding Tool
═══════════════════════════════════════════════════════════════

USAGE:
  node src/seed/index.js <command> [options]

AVAILABLE COMMANDS:
  demo                      Full demo setup (2 schools + various users)
  quick                     Quick test setup (1 school, minimal users for testing)
  cleanup                   Remove all demo data (DPS, DAV, TEST, IITD, IIMA)
  timetable                 Seed full timetable for DPS school (slots, classes, entries)
  clear-attendance          Clears today's attendance records.
  create-student --email    Creates a specific student with optional NFC tag for testing.
  nfc                       Link NFC tags to students (data in seed/data/nfcTags.js)
  help                      Show this help message

OPTIONS (for create-student):
  --name <string>           Student's full name (required)
  --email <string>          Student's email (required)
  --nfc <string>            Optional NFC UID to link to the student

Remember to check 'backend/src/seed/data/demo.js' for default credentials if running 'demo' or 'quick'.
═══════════════════════════════════════════════════════════════
`);
};

// --- Main CLI Execution Logic ---
const main = async () => {
    const args = process.argv.slice(2); // Get command-line arguments (excluding 'node' and script path)
    const commandName = args[0]?.toLowerCase();

    // Show help if no command or 'help' command is provided.
    if (!commandName || commandName === "help") {
        showHelp();
        return;
    }

    // Check if the requested command exists.
    if (!commands[commandName]) {
        logger.error(`Unknown command: "${commandName}"`);
        showHelp();
        return;
    }

    try {
        // Connect to the database before executing any command.
        await connectDB();

        // Dynamically import and execute the command module.
        const commandModule = await commands[commandName]();
        if (typeof commandModule.default === 'function') {
            await commandModule.default(args.slice(1)); // Pass remaining arguments to the command handler
        } else {
            logger.error(`Command module for "${commandName}" did not export a default function.`);
        }

    } catch (error) {
        logger.error({ err: error }, `Error executing command "${commandName}": ${error.message}`);
        // Ensure process exits with a non-zero code on error.
        process.exitCode = 1;
    } finally {
        // Always disconnect from the database.
        await disconnectDB();
    }
};

main();

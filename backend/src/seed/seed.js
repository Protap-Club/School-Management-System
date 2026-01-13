#!/usr/bin/env node
/**
 * Seed Manager - Unified CLI for database seeding
 * 
 * Usage:
 *   node src/seed/seed.js              # Interactive menu
 *   node src/seed/seed.js school       # Create demo schools
 *   node src/seed/seed.js users IITD   # Add users to IITD
 *   node src/seed/seed.js demo         # Full demo setup
 *   node src/seed/seed.js cleanup      # Remove demo data
 */

import readline from "readline";
import { connectDB, disconnectDB } from "../utils/seedRunner.util.js";
import { createSchool } from "./operations/school.js";
import { addAdmins, addTeachers, addStudents } from "./operations/users.js";
import { cleanupDemo } from "./operations/cleanup.js";
import { DEMO_SCHOOLS, DEMO_USERS } from "./data/demo.js";
import { conf } from "../config/index.js";

// ═══════════════════════════════════════════════════════════════
// Command Handlers
// ═══════════════════════════════════════════════════════════════

const commands = {
    /**
     * Create demo schools with SuperAdmin
     */
    async school(args) {
        const code = args[0];

        if (code) {
            // Create specific school
            const schoolData = DEMO_SCHOOLS.find(s => s.code === code.toUpperCase());
            if (!schoolData) {
                console.log(`❌ School code '${code}' not found in demo data`);
                console.log(`   Available: ${DEMO_SCHOOLS.map(s => s.code).join(", ")}`);
                return;
            }
            await createSchool(schoolData);
        } else {
            // Create all demo schools
            console.log("\n🏫 Creating Demo Schools...\n");
            for (const schoolData of DEMO_SCHOOLS) {
                await createSchool(schoolData);
            }
        }

        console.log("\n🔐 Login Credentials:");
        DEMO_SCHOOLS.forEach(s => {
            console.log(`   ${s.code}: vraj.${s.code.toLowerCase()}@protap.com / ${conf.SUPER_ADMIN_PASSWORD || "Admin@123"}`);
        });
    },

    /**
     * Add users to a school
     */
    async users(args) {
        const code = args[0]?.toUpperCase();

        if (!code) {
            console.log("❌ Usage: seed.js users <SCHOOL_CODE>");
            console.log(`   Available: ${Object.keys(DEMO_USERS).join(", ")}`);
            return;
        }

        const userData = DEMO_USERS[code];
        if (!userData) {
            console.log(`❌ No demo users for school '${code}'`);
            console.log(`   Available: ${Object.keys(DEMO_USERS).join(", ")}`);
            return;
        }

        console.log(`\n👥 Adding users to ${code}...\n`);

        if (userData.admins?.length) await addAdmins(code, userData.admins);
        if (userData.teachers?.length) await addTeachers(code, userData.teachers);
        if (userData.students?.length) await addStudents(code, userData.students);

        console.log("\n✅ Users added!");
    },

    /**
     * Full demo setup - schools + users
     */
    async demo() {
        console.log("\n🚀 Running Full Demo Setup...\n");

        // Create all schools
        await commands.school([]);

        // Add users to each school
        for (const code of Object.keys(DEMO_USERS)) {
            await commands.users([code]);
        }

        console.log("\n🎉 Demo setup complete!");
    },

    /**
     * Cleanup demo data
     */
    async cleanup() {
        await cleanupDemo();
    },

    /**
     * Show help
     */
    help() {
        console.log(`
🌱 Seed Manager - Database Seeding Tool
════════════════════════════════════════════════════

Commands:
  school [CODE]     Create school(s) with SuperAdmin
                    - No code: creates all demo schools
                    - With code: creates specific school

  users <CODE>      Add demo users to a school
                    - Adds admins, teachers, students

  demo              Full demo setup
                    - Creates all schools + all users

  cleanup           Remove demo data
                    - Deletes demo institutes and users

  help              Show this help message

Examples:
  node src/seed/seed.js school              # All schools
  node src/seed/seed.js school IITD         # Only IITD
  node src/seed/seed.js users IITD          # Add users to IITD
  node src/seed/seed.js demo                # Full setup
  node src/seed/seed.js cleanup             # Clean up

Available Schools: ${DEMO_SCHOOLS.map(s => s.code).join(", ")}
`);
    }
};

// ═══════════════════════════════════════════════════════════════
// Interactive Menu
// ═══════════════════════════════════════════════════════════════

const showMenu = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    console.log(`
🌱 Seed Manager
═══════════════════════════════════════════
1. Create Schools (with SuperAdmin)
2. Add Users to a School
3. Full Demo Setup (schools + users)
4. Cleanup Demo Data
5. Help
0. Exit
═══════════════════════════════════════════`);

    const choice = await question("\nChoose an option: ");

    rl.close();

    switch (choice) {
        case "1":
            await commands.school([]);
            break;
        case "2":
            const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
            const code = await new Promise(r => rl2.question(`Enter school code (${Object.keys(DEMO_USERS).join("/")}): `, r));
            rl2.close();
            await commands.users([code]);
            break;
        case "3":
            await commands.demo();
            break;
        case "4":
            await commands.cleanup();
            break;
        case "5":
            commands.help();
            return false; // Don't exit
        case "0":
            return true; // Exit
        default:
            console.log("Invalid option");
            return false;
    }

    return true;
};

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

const main = async () => {
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase();

    try {
        await connectDB();

        if (!command) {
            // Interactive mode
            await showMenu();
        } else if (commands[command]) {
            // Command mode
            await commands[command](args.slice(1));
        } else {
            console.log(`❌ Unknown command: ${command}`);
            commands.help();
        }

        await disconnectDB();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        await disconnectDB();
        process.exit(1);
    }
};

main();

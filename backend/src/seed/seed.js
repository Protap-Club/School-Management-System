#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * Seed Manager - Database Seeding CLI
 * ═══════════════════════════════════════════════════════════════
 * 
 * Commands:
 *   demo      Full demo setup (2 schools + all users)
 *   quick     Quick test setup (1 school, 1 admin, 2 teachers, 8 students)
 *   cleanup   Remove all demo data
 *   help      Show this help
 * 
 * Usage:
 *   node src/seed/seed.js demo
 *   node src/seed/seed.js quick
 *   node src/seed/seed.js cleanup
 * ═══════════════════════════════════════════════════════════════
 */

import mongoose from "mongoose";
import { conf } from "../config/index.js";
import { USER_ROLES } from "../constants/userRoles.js";
import { createSchool, addUsers, cleanup, DEMO_PASSWORD } from "./helpers.js";
import { DEMO_SCHOOLS, DEMO_USERS } from "./data/demo.js";

// ═══════════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════

const connectDB = async () => {
    try {
        await mongoose.connect(conf.MONGO_URI, { dbName: "Protap" });
        console.log("✅ Connected to MongoDB\n");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
    } catch (error) {
        console.error("❌ Disconnect error:", error.message);
    }
};

// ═══════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════

const commands = {
    /**
     * Full demo setup - 2 schools with all users
     */
    async demo() {
        console.log("🚀 Full Demo Setup\n");
        console.log("═".repeat(50));

        // Create schools
        for (const school of DEMO_SCHOOLS) {
            await createSchool(school);
        }

        // Add users to each school
        for (const [code, users] of Object.entries(DEMO_USERS)) {
            if (users.admins?.length) await addUsers(code, users.admins, USER_ROLES.ADMIN);
            if (users.teachers?.length) await addUsers(code, users.teachers, USER_ROLES.TEACHER);
            if (users.students?.length) await addUsers(code, users.students, USER_ROLES.STUDENT);
        }

        console.log("\n═".repeat(50));
        console.log("🎉 Demo setup complete!\n");
        console.log("📌 Login Credentials (Password: Demo@123):");
        console.log("   DPS: vraj@dps.com");
        console.log("   DAV: vraj@dav.com");
        console.log("═".repeat(50));
    },

    /**
     * Quick test setup - Minimal data for rapid testing
     */
    async quick() {
        console.log("⚡ Quick Test Setup\n");
        console.log("═".repeat(50));

        // Create 1 test school
        await createSchool({
            name: "Test School",
            code: "TEST",
            address: "123 Test Street",
            contactPhone: "+91-9999999999"
        });

        // Add 1 admin
        await addUsers("TEST", [
            { name: "Test Admin", email: "admin@test.com", department: "Administration", employeeId: "TEST-ADM-001" }
        ], USER_ROLES.ADMIN);

        // Add 2 teachers (different classes)
        await addUsers("TEST", [
            { name: "Teacher 10A", email: "teacher10a@test.com", standard: "10th", section: "A", employeeId: "TEST-TCH-001" },
            { name: "Teacher 10B", email: "teacher10b@test.com", standard: "10th", section: "B", employeeId: "TEST-TCH-002" }
        ], USER_ROLES.TEACHER);

        // Add 8 students (4 per class)
        await addUsers("TEST", [
            { name: "Student 1", email: "student1@test.com", rollNumber: "TEST001", standard: "10th", section: "A", year: 2024 },
            { name: "Student 2", email: "student2@test.com", rollNumber: "TEST002", standard: "10th", section: "A", year: 2024 },
            { name: "Student 3", email: "student3@test.com", rollNumber: "TEST003", standard: "10th", section: "A", year: 2024 },
            { name: "Student 4", email: "student4@test.com", rollNumber: "TEST004", standard: "10th", section: "A", year: 2024 },
            { name: "Student 5", email: "student5@test.com", rollNumber: "TEST005", standard: "10th", section: "B", year: 2024 },
            { name: "Student 6", email: "student6@test.com", rollNumber: "TEST006", standard: "10th", section: "B", year: 2024 },
            { name: "Student 7", email: "student7@test.com", rollNumber: "TEST007", standard: "10th", section: "B", year: 2024 },
            { name: "Student 8", email: "student8@test.com", rollNumber: "TEST008", standard: "10th", section: "B", year: 2024 }
        ], USER_ROLES.STUDENT);

        console.log("\n═".repeat(50));
        console.log("⚡ Quick setup complete!\n");
        console.log("📌 Login Credentials (Password: Demo@123):");
        console.log("   Super Admin: vraj@test.com");
        console.log("   Admin: admin@test.com");
        console.log("   Teacher 10A: teacher10a@test.com (sees 4 students)");
        console.log("   Teacher 10B: teacher10b@test.com (sees 4 students)");
        console.log("═".repeat(50));
    },

    /**
     * Cleanup demo data
     */
    async cleanup() {
        await cleanup();
    },

    /**
     * Show help
     */
    help() {
        console.log(`
═══════════════════════════════════════════════════════════════
🌱 Seed Manager - Database Seeding Tool
═══════════════════════════════════════════════════════════════

COMMANDS:
  demo      Full demo setup (DPS + DAV schools with users)
  quick     Quick test (1 school, minimal users for testing)
  cleanup   Remove all demo data (DPS, DAV, TEST, IITD, IIMA)
  help      Show this help message

USAGE:
  node src/seed/seed.js demo
  node src/seed/seed.js quick
  node src/seed/seed.js cleanup

PASSWORD: ${DEMO_PASSWORD} (same for all users)

QUICK TEST CREDENTIALS:
  - Super Admin: vraj@test.com
  - Admin: admin@test.com
  - Teacher: teacher10a@test.com, teacher10b@test.com

DEMO CREDENTIALS:
  - DPS Super Admin: vraj@dps.com
  - DAV Super Admin: vraj@dav.com
═══════════════════════════════════════════════════════════════
`);
    }
};

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const main = async () => {
    const command = process.argv[2]?.toLowerCase();

    if (!command || command === "help") {
        commands.help();
        return;
    }

    if (!commands[command]) {
        console.log(`❌ Unknown command: ${command}`);
        commands.help();
        return;
    }

    try {
        await connectDB();
        await commands[command]();
        await disconnectDB();
    } catch (error) {
        console.error("❌ Error:", error.message);
        await disconnectDB();
        process.exit(1);
    }
};

main();

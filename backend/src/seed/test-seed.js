/**
 * Simple Test Seed - Creates minimal test data
 * 1 School, 1 SuperAdmin, 1 Admin, 5 Teachers, 10 Students
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

// Models
import User from "../models/User.model.js";
import School from "../models/School.model.js";
import StudentProfile from "../models/StudentProfile.model.js";
import TeacherProfile from "../models/TeacherProfile.model.js";
import AdminProfile from "../models/AdminProfile.model.js";

const PASSWORD = "Test@123";

const hashPassword = async (pwd) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(pwd, salt);
};

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Clean existing data
        console.log("🧹 Cleaning old data...");
        await User.deleteMany({});
        await School.deleteMany({});
        await StudentProfile.deleteMany({});
        await TeacherProfile.deleteMany({});
        await AdminProfile.deleteMany({});

        const hashedPwd = await hashPassword(PASSWORD);

        // 1. Create Super Admin (no school)
        console.log("\n👑 Creating Super Admin...");
        const superAdmin = await User.create({
            name: "Super Admin",
            email: "superadmin@test.com",
            password: hashedPwd,
            role: "super_admin",
            isActive: true
        });

        // 2. Create School
        console.log("🏫 Creating School...");
        const school = await School.create({
            name: "Test School",
            code: "TEST",
            address: "123 Test Street, Test City",
            contactEmail: "contact@testschool.com",
            contactPhone: "+91-9876543210",
            createdBy: superAdmin._id
        });

        // 3. Create Admin
        console.log("👤 Creating Admin...");
        const admin = await User.create({
            name: "School Admin",
            email: "admin@test.com",
            password: hashedPwd,
            role: "admin",
            schoolId: school._id,
            isActive: true
        });
        await AdminProfile.create({
            userId: admin._id,
            department: "Administration",
            employeeId: "ADM001"
        });

        // 4. Create 5 Teachers
        console.log("👨‍🏫 Creating 5 Teachers...");
        const teachers = [];
        for (let i = 1; i <= 5; i++) {
            const teacher = await User.create({
                name: `Teacher ${i}`,
                email: `teacher${i}@test.com`,
                password: hashedPwd,
                role: "teacher",
                schoolId: school._id,
                isActive: true
            });
            await TeacherProfile.create({
                userId: teacher._id,
                department: ["Math", "Science", "English", "History", "Computer Science"][i - 1],
                designation: "Assistant Professor",
                employeeId: `TCH00${i}`
            });
            teachers.push({ email: `teacher${i}@test.com`, name: `Teacher ${i}` });
        }

        // 5. Create 10 Students
        console.log("🎓 Creating 10 Students...");
        for (let i = 1; i <= 10; i++) {
            const student = await User.create({
                name: `Student ${i}`,
                email: `student${i}@test.com`,
                password: hashedPwd,
                role: "student",
                schoolId: school._id,
                isActive: true
            });
            await StudentProfile.create({
                userId: student._id,
                rollNumber: `2024STU${String(i).padStart(4, '0')}`,
                standard: "10th",
                section: String.fromCharCode(65 + (i % 4)),
                year: 2024
            });
        }

        // Print credentials
        console.log("\n" + "═".repeat(60));
        console.log("✅ SEED COMPLETE! Here are the credentials:");
        console.log("═".repeat(60));
        console.log(`\n📌 Password for ALL users: ${PASSWORD}\n`);

        console.log("┌─────────────┬──────────────────────────┐");
        console.log("│ Role        │ Email                    │");
        console.log("├─────────────┼──────────────────────────┤");
        console.log("│ Super Admin │ superadmin@test.com      │");
        console.log("│ Admin       │ admin@test.com           │");
        console.log("│ Teacher 1   │ teacher1@test.com        │");
        console.log("│ Teacher 2   │ teacher2@test.com        │");
        console.log("│ Teacher 3   │ teacher3@test.com        │");
        console.log("│ Teacher 4   │ teacher4@test.com        │");
        console.log("│ Teacher 5   │ teacher5@test.com        │");
        console.log("└─────────────┴──────────────────────────┘");
        console.log("\n🔐 Students: student1@test.com - student10@test.com");
        console.log("═".repeat(60));

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB");

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
};

run();

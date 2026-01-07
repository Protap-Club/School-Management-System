/**
 * Seed script to create a SuperAdmin user
 * Run with: node src/seed/superadmin.seed.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { conf } from "../config/index.js";
import User from "../models/User.model.js";
import { USER_ROLES } from "../constants/userRoles.js";

const SUPER_ADMIN_EMAIL = "npandyavrajesh31@gmail.com";
const SUPER_ADMIN_NAME = "Super Admin";

const seedSuperAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(conf.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Check if superadmin already exists
        const existingAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
        if (existingAdmin) {
            console.log("⚠️  SuperAdmin already exists with email:", SUPER_ADMIN_EMAIL);
            await mongoose.disconnect();
            process.exit(0);
        }

        // Hash password from env
        const password = conf.SUPER_ADMIN_PASSWORD;
        if (!password) {
            console.error("❌ SUPER_ADMIN_PASSWORD is not set in .env file");
            await mongoose.disconnect();
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create SuperAdmin
        const superAdmin = await User.create({
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            role: USER_ROLES.SUPER_ADMIN,
            isEmailVerified: true,
            isActive: true,
            mustChangePassword: false
        });

        console.log("✅ SuperAdmin created successfully!");
        console.log("   Email:", superAdmin.email);
        console.log("   Role:", superAdmin.role);

        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error seeding SuperAdmin:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedSuperAdmin();

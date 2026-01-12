// SuperAdmin Seed - Legacy script (use schoolProvisioning.seed.js instead)

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { conf } from "../config/index.js";
import User from "../models/User.model.js";
import { USER_ROLES } from "../constants/userRoles.js";

const SUPER_ADMIN_EMAIL = "npandyavrajesh31@gmail.com";
const SUPER_ADMIN_NAME = "Super Admin";

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(conf.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const existingAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
        if (existingAdmin) {
            console.log("⚠️ SuperAdmin already exists:", SUPER_ADMIN_EMAIL);
            await mongoose.disconnect();
            process.exit(0);
        }

        const password = conf.SUPER_ADMIN_PASSWORD;
        if (!password) {
            console.error("❌ SUPER_ADMIN_PASSWORD not set in .env");
            await mongoose.disconnect();
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const superAdmin = await User.create({
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            role: USER_ROLES.SUPER_ADMIN,
            isEmailVerified: true,
            isActive: true,
            mustChangePassword: false
        });

        console.log("✅ SuperAdmin created:", superAdmin.email);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedSuperAdmin();

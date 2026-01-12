/**
 * Reset SuperAdmin password - Run this to fix login issues
 * Usage: node src/seed/resetPassword.seed.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { conf } from "../config/index.js";
import UserModel from "../models/User.model.js";

const resetPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(conf.MONGO_URI);
        console.log("Connected to MongoDB");

        // Find the superadmin user
        const email = "vraj.iitd@protap.com";
        const newPassword = "Admin@123";

        const user = await UserModel.findOne({ email });

        if (!user) {
            console.log(`❌ User not found: ${email}`);
            console.log("\nLet me list all users:");
            const allUsers = await UserModel.find({}).select("name email role");
            allUsers.forEach(u => console.log(`  - ${u.email} (${u.role})`));
            return;
        }

        console.log(`Found user: ${user.name} (${user.email})`);
        console.log(`Role: ${user.role}`);
        console.log(`Is Active: ${user.isActive}`);

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        user.mustChangePassword = false;
        await user.save();

        console.log(`\n✅ Password reset successfully!`);
        console.log(`\n🔐 LOGIN CREDENTIALS:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
};

resetPassword();

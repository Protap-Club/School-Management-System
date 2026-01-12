/**
 * Cleanup Seed - Remove demo data from database
 * Run this before seeding new schools
 */

import mongoose from "mongoose";
import { conf } from "../config/index.js";
import UserModel from "../models/User.model.js";
import InstituteModel from "../models/Institute.model.js";
import AdminProfileModel from "../models/AdminProfile.model.js";
import TeacherProfileModel from "../models/TeacherProfile.model.js";
import StudentProfileModel from "../models/StudentProfile.model.js";

const cleanup = async () => {
    console.log("\n🧹 CLEANUP - Removing demo data...\n");

    try {
        await mongoose.connect(conf.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Find demo institutes
        const demoInstitutes = await InstituteModel.find({
            $or: [
                { code: "DEMO001" },
                { code: { $regex: /^DEMO/i } }
            ]
        });

        if (demoInstitutes.length === 0) {
            console.log("ℹ️  No demo institutes found");
        } else {
            for (const institute of demoInstitutes) {
                console.log(`\n🗑️  Removing: ${institute.name} (${institute.code})`);

                // Get all users in this institute
                const users = await UserModel.find({ instituteId: institute._id });
                const userIds = users.map(u => u._id);

                // Delete profiles
                const adminDeleted = await AdminProfileModel.deleteMany({ userId: { $in: userIds } });
                const teacherDeleted = await TeacherProfileModel.deleteMany({ userId: { $in: userIds } });
                const studentDeleted = await StudentProfileModel.deleteMany({ userId: { $in: userIds } });

                console.log(`   Profiles deleted: ${adminDeleted.deletedCount} admin, ${teacherDeleted.deletedCount} teacher, ${studentDeleted.deletedCount} student`);

                // Delete users
                const usersDeleted = await UserModel.deleteMany({ instituteId: institute._id });
                console.log(`   Users deleted: ${usersDeleted.deletedCount}`);

                // Delete institute
                await InstituteModel.findByIdAndDelete(institute._id);
                console.log(`   Institute deleted: ${institute.code}`);
            }
        }

        // Also delete orphan demo users (with demo email pattern)
        const demoUsers = await UserModel.deleteMany({
            email: { $regex: /@demo\.school$/i }
        });
        if (demoUsers.deletedCount > 0) {
            console.log(`\n🗑️  Deleted ${demoUsers.deletedCount} orphan demo users`);
        }

        console.log("\n✅ Cleanup complete!");

        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB\n");
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

cleanup();

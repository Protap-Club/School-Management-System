/**
 * Cleanup Operations - Remove demo data
 */

import mongoose from "mongoose";
import UserModel from "../../models/User.model.js";
import SchoolModel from "../../models/School.model.js";
import AdminProfileModel from "../../models/AdminProfile.model.js";
import TeacherProfileModel from "../../models/TeacherProfile.model.js";
import StudentProfileModel from "../../models/StudentProfile.model.js";

/**
 * Drop stale indexes that may cause issues
 */
const dropStaleIndexes = async () => {
    try {
        const userCollection = mongoose.connection.db.collection('users');
        const indexes = await userCollection.indexes();

        // Check for username index
        const usernameIndex = indexes.find(idx => idx.key?.username);
        if (usernameIndex) {
            console.log("   ⚠️  Dropping stale 'username' index...");
            await userCollection.dropIndex("username_1");
            console.log("   ✅ Index dropped");
        }
    } catch (error) {
        // Index might not exist, that's fine
        if (!error.message.includes('not found')) {
            console.log("   ℹ️  No stale indexes to drop");
        }
    }
};

/**
 * Remove all demo schools and their users
 * Includes: IITD, IIMA, DPS, DAV, or anything starting with DEMO
 */
export const cleanupDemo = async () => {
    console.log("\n🧹 Cleaning up demo data...\n");

    // First drop any stale indexes
    await dropStaleIndexes();

    // Find demo schools (all known demo codes)
    const demoSchools = await SchoolModel.find({
        $or: [
            { code: "IITD" },
            { code: "IIMA" },
            { code: "DPS" },
            { code: "DAV" },
            { code: { $regex: /^DEMO/i } }
        ]
    });

    let totalDeleted = { schools: 0, users: 0, profiles: 0 };

    if (demoSchools.length === 0) {
        console.log("   ℹ️  No demo schools found");
    } else {
        for (const school of demoSchools) {
            console.log(`   Removing: ${school.name} (${school.code})`);

            // Get users
            const users = await UserModel.find({ schoolId: school._id });
            const userIds = users.map(u => u._id);

            // Delete profiles
            const adminDel = await AdminProfileModel.deleteMany({ userId: { $in: userIds } });
            const teacherDel = await TeacherProfileModel.deleteMany({ userId: { $in: userIds } });
            const studentDel = await StudentProfileModel.deleteMany({ userId: { $in: userIds } });
            totalDeleted.profiles += adminDel.deletedCount + teacherDel.deletedCount + studentDel.deletedCount;

            // Delete users
            const usersDel = await UserModel.deleteMany({ schoolId: school._id });
            totalDeleted.users += usersDel.deletedCount;

            // Delete school
            await SchoolModel.findByIdAndDelete(school._id);
            totalDeleted.schools++;
        }
    }

    // Delete orphan demo users (all known demo email patterns)
    const orphanUsers = await UserModel.deleteMany({
        email: {
            $regex: /@(demo\.school|iitd\.ac\.in|iima\.ac\.in|student\.iitd\.ac\.in|student\.iima\.ac\.in|dps\.com|dav\.com|dps\.edu\.in|dav\.edu\.in|protap\.com)$/i
        }
    });
    totalDeleted.users += orphanUsers.deletedCount;

    console.log(`\n   ✅ Deleted: ${totalDeleted.schools} schools, ${totalDeleted.users} users, ${totalDeleted.profiles} profiles`);

    return { success: true, deleted: totalDeleted };
};

export default { cleanupDemo };


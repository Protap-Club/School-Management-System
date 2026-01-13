/**
 * Cleanup Operations - Remove demo data
 */

import UserModel from "../../models/User.model.js";
import SchoolModel from "../../models/School.model.js";
import AdminProfileModel from "../../models/AdminProfile.model.js";
import TeacherProfileModel from "../../models/TeacherProfile.model.js";
import StudentProfileModel from "../../models/StudentProfile.model.js";

/**
 * Remove demo schools and their users
 */
export const cleanupDemo = async () => {
    console.log("\n🧹 Cleaning up demo data...\n");

    // Find demo schools
    const demoSchools = await SchoolModel.find({
        $or: [
            { code: "DEMO001" },
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

    // Delete orphan demo users
    const orphanUsers = await UserModel.deleteMany({ email: { $regex: /@demo\.school$/i } });
    totalDeleted.users += orphanUsers.deletedCount;

    console.log(`\n   ✅ Deleted: ${totalDeleted.schools} schools, ${totalDeleted.users} users, ${totalDeleted.profiles} profiles`);

    return { success: true, deleted: totalDeleted };
};

export default { cleanupDemo };

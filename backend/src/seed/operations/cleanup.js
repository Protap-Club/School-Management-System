/**
 * Cleanup Operations - Remove demo data
 */

import UserModel from "../../models/User.model.js";
import InstituteModel from "../../models/Institute.model.js";
import AdminProfileModel from "../../models/AdminProfile.model.js";
import TeacherProfileModel from "../../models/TeacherProfile.model.js";
import StudentProfileModel from "../../models/StudentProfile.model.js";

/**
 * Remove demo institutes and their users
 */
export const cleanupDemo = async () => {
    console.log("\n🧹 Cleaning up demo data...\n");

    // Find demo institutes
    const demoInstitutes = await InstituteModel.find({
        $or: [
            { code: "DEMO001" },
            { code: { $regex: /^DEMO/i } }
        ]
    });

    let totalDeleted = { institutes: 0, users: 0, profiles: 0 };

    if (demoInstitutes.length === 0) {
        console.log("   ℹ️  No demo institutes found");
    } else {
        for (const institute of demoInstitutes) {
            console.log(`   Removing: ${institute.name} (${institute.code})`);

            // Get users
            const users = await UserModel.find({ instituteId: institute._id });
            const userIds = users.map(u => u._id);

            // Delete profiles
            const adminDel = await AdminProfileModel.deleteMany({ userId: { $in: userIds } });
            const teacherDel = await TeacherProfileModel.deleteMany({ userId: { $in: userIds } });
            const studentDel = await StudentProfileModel.deleteMany({ userId: { $in: userIds } });
            totalDeleted.profiles += adminDel.deletedCount + teacherDel.deletedCount + studentDel.deletedCount;

            // Delete users
            const usersDel = await UserModel.deleteMany({ instituteId: institute._id });
            totalDeleted.users += usersDel.deletedCount;

            // Delete institute
            await InstituteModel.findByIdAndDelete(institute._id);
            totalDeleted.institutes++;
        }
    }

    // Delete orphan demo users
    const orphanUsers = await UserModel.deleteMany({ email: { $regex: /@demo\.school$/i } });
    totalDeleted.users += orphanUsers.deletedCount;

    console.log(`\n   ✅ Deleted: ${totalDeleted.institutes} institutes, ${totalDeleted.users} users, ${totalDeleted.profiles} profiles`);

    return { success: true, deleted: totalDeleted };
};

export default { cleanupDemo };

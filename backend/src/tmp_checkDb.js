import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_management');
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).toArray();
        console.log(`Total users: ${users.length}`);
        const roles = [...new Set(users.map(u => u.role))];
        console.log('Roles found:', roles);

        const teachers = users.filter(u => u.role === 'teacher' || u.role === 'TEACHER');
        console.log(`Found ${teachers.length} teachers`);
        if (teachers.length > 0) {
            const firstTeacher = teachers[0];
            console.log('Sample Teacher:', firstTeacher.email, firstTeacher.schoolId);
            const school = await db.collection('schools').findOne({ _id: firstTeacher.schoolId });
            console.log('School features:', school?.features);

            const profile = await db.collection('teacherprofiles').findOne({ userId: firstTeacher._id });
            console.log('Teacher Profile exists:', !!profile);
            if (profile) console.log('Teacher assignedClasses:', profile.assignedClasses);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();

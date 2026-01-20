import mongoose from 'mongoose';
import { conf } from '../config/index.js';

const clearTodayAttendance = async () => {
    try {
        await mongoose.connect(conf.MONGO_URI, { dbName: "Protap" });
        console.log('Connected to MongoDB');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await mongoose.connection.db.collection('attendances').deleteMany({
            date: { $gte: today }
        });

        console.log(`✅ Deleted ${result.deletedCount} attendance record(s) for today`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

clearTodayAttendance();

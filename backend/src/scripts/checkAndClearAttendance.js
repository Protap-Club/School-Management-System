
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env file in root
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

const checkAndClear = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error("No Mongo URI found in environment!");
        process.exit(1);
    }
    
    await mongoose.connect(uri, { dbName: 'Protap' });
    console.log('Connected to MongoDB');
    console.log('DB Name:', mongoose.connection.name);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // INSPECT
    const allRecords = await Attendance.find({}).sort({ date: -1 });
    console.log(`Found ${allRecords.length} total attendance records.`);
    allRecords.forEach(r => {
        console.log(`- ID: ${r._id}, Date: ${r.date}, Student: ${r.studentId}, MarkedBy: ${r.markedBy}`);
    });

    // START OF DAY CHECK
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    console.log(`Script "Start of Day" (Local): ${startOfDay}`);
    
    // DELETE ALL (For Testing Purposes - User asked to clear)
    const result = await Attendance.deleteMany({});
    
    console.log(`DELETED ${result.deletedCount} records.`);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAndClear();

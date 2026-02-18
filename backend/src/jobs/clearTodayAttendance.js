
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env file in root
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('Loading env from:', envPath);
console.log('MONGO URI:', process.env.MONGO_URI ? 'Found' : 'Missing');

const clearAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await Attendance.deleteMany({
      date: { $gte: startOfDay }
    });

    console.log(`Deleted ${result.deletedCount} attendance records for today.`);
    
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

clearAttendance();

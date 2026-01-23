// Command to clear today's attendance records
import mongoose from 'mongoose'; // Still need mongoose for model interaction
import logger from "../../config/logger.js";

/**
 * Clears all attendance records for the current day.
 */
const clearAttendance = async () => {
    logger.info("Attempting to clear today's attendance records...");

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of today

    try {
        const result = await mongoose.connection.db.collection('attendances').deleteMany({
            date: { $gte: today }
        });
        logger.info(`Deleted ${result.deletedCount} attendance record(s) for today.`);
    } catch (error) {
        logger.error({ err: error }, 'Error clearing today\'s attendance:');
        throw error; // Re-throw to be caught by the main seed script's error handler
    }
};

export default clearAttendance;

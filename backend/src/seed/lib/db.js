// Seeder Database Utility
// Handles connecting to and disconnecting from MongoDB for seeding scripts.

import mongoose from 'mongoose';
import { conf } from '../../config/index.js';
import logger from '../../config/logger.js';

/**
 * Establishes a connection to the MongoDB database using the URI from config.
 */
export const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            logger.info('Already connected to MongoDB.');
            return;
        }
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(conf.MONGO_URI, { dbName: "Protap" });
        logger.info('MongoDB connected successfully.');
    } catch (error) {
        logger.error({ err: error }, 'MongoDB connection error:');
        process.exit(1);
    }
};

/**
 * Disconnects from the MongoDB database.
 */
export const disconnectDB = async () => {
    try {
        if (mongoose.connection.readyState === 0) {
            logger.info('Already disconnected from MongoDB.');
            return;
        }
        await mongoose.disconnect();
        logger.info('MongoDB disconnected successfully.');
    } catch (error) {
        logger.error({ err: error }, 'Error disconnecting from MongoDB:');
    }
};

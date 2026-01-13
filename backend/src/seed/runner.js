// Seed Runner - Database connection and execution framework
import mongoose from "mongoose";
import { conf } from "../config/index.js";

export const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log("📦 Already connected to MongoDB");
            return;
        }
        await mongoose.connect(conf.MONGO_URI);
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
    } catch (error) {
        console.error("❌ MongoDB disconnect error:", error.message);
    }
};

export const runSeed = async (operationName, seedFunction, options = {}) => {
    const { exitOnComplete = true, disconnectAfter = true } = options;

    console.log(`\n🌱 Starting: ${operationName}`);
    console.log("=".repeat(50));

    try {
        await connectDB();
        const result = await seedFunction();

        console.log("=".repeat(50));
        console.log(`✅ Completed: ${operationName}\n`);

        if (disconnectAfter) await disconnectDB();
        if (exitOnComplete) process.exit(0);

        return result;
    } catch (error) {
        console.log("=".repeat(50));
        console.error(`❌ Failed: ${operationName}`, error.message);

        if (disconnectAfter) await disconnectDB();
        if (exitOnComplete) process.exit(1);

        throw error;
    }
};

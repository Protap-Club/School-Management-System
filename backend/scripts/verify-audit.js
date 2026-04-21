import "dotenv/config";
import mongoose from "mongoose";
import { AuditLog } from "../src/module/audit/AuditLog.model.js";

const verifyAuditLogs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/school-management");
        console.log("Connected to MongoDB.");

        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(20);
        console.log(`Found ${logs.length} recent audit logs.`);
        
        for (const log of logs) {
            console.log(`- Action: ${log.action} | Status: ${log.status} | IP: ${log.ipAddress}`);
        }

        console.log("Audit log verification complete.");
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
};

verifyAuditLogs();

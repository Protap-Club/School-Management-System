// DB connect/disconnect helpers for the seed CLI
import mongoose from "mongoose";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, "../../../.env") });

export const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "Protap" });
    console.log(`DB connected  →  ${mongoose.connection.name}`);
};

export const disconnectDB = async () => {
    await mongoose.disconnect();
    console.log("DB disconnected");
};

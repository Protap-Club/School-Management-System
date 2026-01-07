import dotenv from "dotenv";
dotenv.config();

export const conf = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
};
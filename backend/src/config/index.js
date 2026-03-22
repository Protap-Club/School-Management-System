import dotenv from "dotenv";
dotenv.config();

export const conf = {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    DB_NAME: process.env.DB_NAME,
    JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || "1mb",
    TEXT_BODY_LIMIT: process.env.TEXT_BODY_LIMIT || "100kb",
    CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),

    // SMTP Configuration for Email
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || 587,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,

    // Cloudinary Configuration for File Uploads
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

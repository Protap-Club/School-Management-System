import dotenv from "dotenv";
dotenv.config();

const parseCsv = (value = "") =>
    value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

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
    LOG_LEVEL: process.env.LOG_LEVEL,
    JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || "1mb",
    TEXT_BODY_LIMIT: process.env.TEXT_BODY_LIMIT || "100kb",
    CORS_ORIGINS: parseCsv(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || ""),
    FRONTEND_URL: process.env.FRONTEND_URL,
    MOBILE_RESET_URL: process.env.MOBILE_RESET_URL,

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

    // Content Security Policy Configuration
    CSP_MODE: (process.env.CSP_MODE || 'report-only').toLowerCase(), // report-only | enforce | off
    CSP_REPORT_URI: process.env.CSP_REPORT_URI || '/api/v1/security/csp-report',
    CSP_CONNECT_SRC: parseCsv(process.env.CSP_CONNECT_SRC || ""),
    CSP_IMG_SRC: parseCsv(process.env.CSP_IMG_SRC || ""),
    CSP_STYLE_SRC: parseCsv(process.env.CSP_STYLE_SRC || ""),
    CSP_FONT_SRC: parseCsv(process.env.CSP_FONT_SRC || ""),
};

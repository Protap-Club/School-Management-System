import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { conf } from '../config/index.js';
import logger from "../config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_CACHE = new Map(); // Cache templates to avoid constant Disk I/O
const TEMPLATE_DIR = path.join(__dirname, '../view');

let transporter = nodemailer.createTransport({
    host: conf.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(conf.SMTP_PORT) || 587,
    secure: conf.SMTP_PORT === '465', 
    auth: { user: conf.SMTP_USER, pass: conf.SMTP_PASS }
});

// Loads and caches email templates
const getTemplate = async (templateName) => {
    if (TEMPLATE_CACHE.has(templateName)) return TEMPLATE_CACHE.get(templateName);
    
    // Path traversal guard: enforce safe basename and verify resolved path
    const safeName = path.basename(templateName);
    if (safeName !== templateName) {
        throw new Error(`Invalid template name: ${templateName}`);
    }

    const templatePath = path.resolve(TEMPLATE_DIR, safeName);
    if (!templatePath.startsWith(path.resolve(TEMPLATE_DIR))) {
        throw new Error(`Template path escapes allowed directory: ${templateName}`);
    }

    const content = await fs.readFile(templatePath, 'utf-8');
    TEMPLATE_CACHE.set(templateName, content);
    return content;
};

// Basic Template Parser (Senior version: use EJS/Handlebars instead)
const parseTemplate = (html, data) => {
    return html.replace(/{{(\w+)}}/g, (match, key) => data[key] || '');
};

// Sends credentials email with School Branding
export const sendCredentialsEmail = async ({ to, name, role, password, schoolName, updatePasswordUrl }) => {
    try {
        // ── DEV GUARD ────────────────────────────────────────────────────────────
        // In local development we skip real email delivery and just log
        // the credentials to the console.  Remove this block (or set
        // NODE_ENV=production) before deploying to a live environment.
        if (process.env.NODE_ENV !== 'production') {
            logger.warn(`[DEV] Email sending skipped. Credentials for ${to}:`);
            logger.warn(`[DEV]   Name     : ${name}`);
            logger.warn(`[DEV]   Role     : ${role}`);
            logger.warn(`[DEV]   Email    : ${to}`);
            logger.warn(`[DEV]   Password : ${password}`);
            return { success: true };
        }
        // ─────────────────────────────────────────────────────────────────────────

        if (!conf.SMTP_USER || !conf.SMTP_PASS) {
            logger.warn("SMTP not configured. Email skipped.");
            return { success: false };
        }

        const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        const displaySchool = schoolName || "Our School"; // Default fallback
        const recipientLabelMap = {
            student: "Student Name",
            teacher: "Teacher Name",
            admin: "Admin Name",
            super_admin: "Administrator Name",
        };
        const recipientLabel = recipientLabelMap[role] || "User Name";
        // Default to frontend URL if not provided
        const passwordUpdateUrl = updatePasswordUrl || `${conf.FRONTEND_URL || 'http://localhost:5173'}/update-password`;

        const rawHtml = await getTemplate('credentials.template.html');
        const htmlContent = parseTemplate(rawHtml, { name, to, password, schoolName: displaySchool, recipientLabel, updatePasswordUrl: passwordUpdateUrl });

        const mailOptions = {
            from: `"${displaySchool}" <${conf.SMTP_FROM || conf.SMTP_USER}>`, // Dynamic branding
            to,
            subject: `Welcome to ${displaySchool} - Account Created`,
            html: htmlContent,
            text: `Welcome ${name}. Your ${roleDisplay} account for ${displaySchool} is ready. Email: ${to}, Password: ${password}. Please update your password at: ${passwordUpdateUrl}`
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email Sent: ${info.messageId} to ${to}`);
        return { success: true };
    } catch (error) {
        logger.error(`Email Failure: ${error.message}`);
        return { success: false, error: error.message };
    }
};

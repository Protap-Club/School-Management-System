import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { conf } from '../config/index.js';
import logger from "../config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_CACHE = new Map(); // Cache templates to avoid constant Disk I/O

let transporter = nodemailer.createTransport({
    host: conf.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(conf.SMTP_PORT) || 587,
    secure: conf.SMTP_PORT === '465', 
    auth: { user: conf.SMTP_USER, pass: conf.SMTP_PASS }
});

// Loads and caches email templates
const getTemplate = async (templateName) => {
    if (TEMPLATE_CACHE.has(templateName)) return TEMPLATE_CACHE.get(templateName);
    
    const templatePath = path.join(__dirname, '../templates', templateName);
    const content = await fs.readFile(templatePath, 'utf-8');
    TEMPLATE_CACHE.set(templateName, content);
    return content;
};

// Basic Template Parser (Senior version: use EJS/Handlebars instead)
const parseTemplate = (html, data) => {
    return html.replace(/{{(\w+)}}/g, (match, key) => data[key] || '');
};

// Sends credentials email with School Branding
export const sendCredentialsEmail = async ({ to, name, role, password, schoolName }) => {
    try {

        if(conf.NODE_ENV !== 'production'){
            logger.info(`Email skipped (non -prod) :${to}`);
            return { success : true, skipped : true};
        }

        if (!conf.SMTP_USER) {
            logger.warn("SMTP not configured. Email skipped.");
            return { success: false };
        }

        const roleDisplay = role.replace('_', ' ').toUpperCase();
        const displaySchool = schoolName || "Our School"; // Default fallback

        const rawHtml = await getTemplate('credentials.template.html');
        const htmlContent = parseTemplate(rawHtml, {
            name,
            role: roleDisplay,
            email: to,
            password,
            schoolName: displaySchool
        });

        const mailOptions = {
            from: `"${displaySchool}" <${conf.SMTP_FROM || conf.SMTP_USER}>`, // Dynamic branding
            to,
            subject: `Welcome to ${displaySchool} - Account Created`,
            html: htmlContent,
            text: `Welcome ${name}. Your ${roleDisplay} account for ${displaySchool} is ready. Email: ${to}, Password: ${password}`
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email Sent: ${info.messageId} to ${to}`);
        return { success: true };
    } catch (error) {
        logger.error(`Email Failure: ${error.message}`);
        return { success: false, error: error.message };
    }
};
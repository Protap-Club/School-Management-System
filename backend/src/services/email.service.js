/**
 * Email service for sending notifications.
 * Uses Nodemailer with SMTP configuration to send various types of emails,
 * such as new user credentials or system alerts.
 */

import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { conf } from '../config/index.js';
import logger from "../config/logger.js"; // Import the logger

// --- Singleton Transporter ---
// This ensures that the Nodemailer transporter is created only once and reused
// for all email sending operations, improving efficiency.
let transporter;

/**
 * Creates and returns a singleton Nodemailer transporter instance.
 * The transporter is configured using SMTP settings from the application's configuration.
 * @returns {nodemailer.Transporter|null} The Nodemailer transporter instance, or null if SMTP credentials are not set.
 */
const createTransporter = () => {
    // Return existing transporter if already created
    if (transporter) {
        return transporter;
    }

    // Log an error if SMTP credentials are missing, preventing email sending.
    if (!conf.SMTP_USER || !conf.SMTP_PASS) {
        logger.error('SMTP credentials not set in .env file! Cannot create email transporter.');
        return null;
    }

    logger.info('Creating new email transporter instance.');
    transporter = nodemailer.createTransport({
        host: conf.SMTP_HOST || 'smtp.gmail.com', // Fallback to Gmail SMTP if not configured
        port: parseInt(conf.SMTP_PORT) || 587,    // Default SMTP port
        secure: false, // `true` for 465 (SSL/TLS), `false` for other ports (STARTTLS)
        auth: {
            user: conf.SMTP_USER,
            pass: conf.SMTP_PASS
        }
    });
    
    return transporter;
};

// Initialize the transporter when the service file is loaded.
createTransporter();


// --- Template Rendering ---

/**
 * Renders an HTML email template by reading the file and replacing placeholders.
 * Placeholders in the template should be in the format `{{key}}`.
 * @param {string} templateName - The filename of the template (e.g., 'credentials.template.html').
 * @param {object} data - An object where keys match template placeholders (e.g., `{ name: 'John' }`).
 * @returns {Promise<string>} The fully rendered HTML content of the email.
 * @throws {Error} If the template file cannot be read or rendered.
 */
const renderTemplate = async (templateName, data) => {
    try {
        // Resolve the current directory and construct the path to the template.
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const templatePath = path.join(__dirname, '../templates', templateName);
        
        // Read the template file content.
        let html = await fs.readFile(templatePath, 'utf-8');

        // Replace all occurrences of `{{key}}` with the corresponding value from the data object.
        for (const key in data) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, data[key]);
        }
        
        return html;
    } catch (error) {
        logger.error(`Error rendering email template ${templateName}: ${error.message}`);
        throw new Error(`Could not render email template: ${templateName}`);
    }
};


/**
 * Sends a welcome email with new user credentials.
 * This is typically used when a new user account is created.
 * @param {Object} params - Parameters for the email.
 * @param {string} params.to - The recipient's email address.
 * @param {string} params.name - The name of the user.
 * @param {string} params.role - The role of the user (e.g., 'admin', 'teacher').
 * @param {string} params.password - The generated password for the new user.
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>} Object indicating success or failure of email sending.
 */
export const sendCredentialsEmail = async ({ to, name, role, password }) => {
    try {
        // Check if the transporter was successfully created.
        if (!transporter) {
            logger.error('Transporter not available for sending credentials email. Check SMTP configuration.');
            return { success: false, error: 'SMTP not configured' };
        }
        
        // Format the role for display in the email (e.g., 'super_admin' -> 'Super Admin').
        const roleDisplayName = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Render the email HTML content using the credentials template and provided data.
        const htmlContent = await renderTemplate('credentials.template.html', {
            name,
            roleDisplayName,
            to,
            password
        });
        
        // Define mail options including sender, recipient, subject, and content.
        const mailOptions = {
            from: `"School Management System" <${conf.SMTP_FROM || conf.SMTP_USER}>`,
            to: to,
            subject: `Welcome to School Management System - Your ${roleDisplayName} Account`,
            html: htmlContent,
            text: `Welcome ${name}!\n\nYour account has been created with role: ${roleDisplayName}\n\nEmail: ${to}\nPassword: ${password}\n\nPlease change your password after first login.\n\nSchool Management System`
        };

        logger.info(`Attempting to send credentials email to: ${to}`);
        // Send the email using the configured transporter.
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Credentials email sent successfully to ${to}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        logger.error(`Failed to send credentials email to ${to}: ${error.message}`);
        // This function should not throw, as user creation should ideally still succeed
        // even if email notification fails. Return success: false instead.
        return { success: false, error: error.message };
    }
};

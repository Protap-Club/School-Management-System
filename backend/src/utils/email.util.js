import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { conf } from '../config/index.js';
import logger from "../config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_CACHE = new Map();
const TEMPLATE_DIR = path.join(__dirname, '../view');

const transporter = nodemailer.createTransport({
    host: conf.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(conf.SMTP_PORT, 10) || 587,
    secure: String(conf.SMTP_PORT) === '465',
    auth: { user: conf.SMTP_USER, pass: conf.SMTP_PASS }
});

const getTemplate = async (templateName) => {
    if (TEMPLATE_CACHE.has(templateName)) return TEMPLATE_CACHE.get(templateName);

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

const parseTemplate = (html, data) => {
    return html.replace(/{{(\w+)}}/g, (_match, key) => data[key] || '');
};

const resolveWebResetUrl = (resetToken) => {
    const frontendBase = conf.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendBase}/reset-password?token=${encodeURIComponent(resetToken)}`;
};



export const sendCredentialsEmail = async ({ to, name, role, password, schoolName, updatePasswordUrl }) => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            logger.warn(`[DEV] Email sending skipped. Credentials for ${to}:`);
            logger.warn(`[DEV]   Name     : ${name}`);
            logger.warn(`[DEV]   Role     : ${role}`);
            logger.warn(`[DEV]   Email    : ${to}`);
            logger.warn(`[DEV]   Password : ${password}`);
            return { success: true };
        }

        if (!conf.SMTP_USER || !conf.SMTP_PASS) {
            logger.warn('SMTP not configured. Email skipped.');
            return { success: false };
        }

        const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        const displaySchool = schoolName || 'Our School';
        const recipientLabelMap = {
            student: 'Student Name',
            teacher: 'Teacher Name',
            admin: 'Admin Name',
            super_admin: 'Administrator Name',
        };
        const recipientLabel = recipientLabelMap[role] || 'User Name';
        const passwordUpdateUrl = updatePasswordUrl || `${conf.FRONTEND_URL || 'http://localhost:5173'}/update-password`;

        const rawHtml = await getTemplate('credentials.template.html');
        const htmlContent = parseTemplate(rawHtml, {
            name,
            to,
            password,
            schoolName: displaySchool,
            recipientLabel,
            updatePasswordUrl: passwordUpdateUrl,
        });

        const mailOptions = {
            from: `"${displaySchool}" <${conf.SMTP_FROM || conf.SMTP_USER}>`,
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

export const sendPasswordResetEmail = async ({
    to,
    name,
    resetToken,
    resetOtp,
    method,
    expiresInMinutes = 15,
    schoolName,
}) => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            logger.warn('[DEV] Password reset email sending skipped.');
            logger.warn(`[DEV]   Recipient : ${to}`);
            logger.warn(`[DEV]   Name      : ${name}`);
            logger.warn(`[DEV]   Reset Token: ${resetToken}`);
            logger.warn(`[DEV]   Reset OTP : ${resetOtp}`);
            logger.warn(`[DEV]   Method    : ${method || 'both'}`);
            return { success: true };
        }

        if (!conf.SMTP_USER || !conf.SMTP_PASS) {
            logger.warn('SMTP not configured. Password reset email skipped.');
            return { success: false };
        }

        const displaySchool = schoolName || 'School Management System';
        const resetUrl = resetToken ? resolveWebResetUrl(resetToken) : null;
        const expiresInText = `${expiresInMinutes} minutes`;

        // Build the method-specific content block for the template
        let contentBlock = '';
        let methodLabel = 'request';

        if (method === 'link' && resetUrl) {
            methodLabel = 'link';
            contentBlock = `
                <p>Click the button below to reset your password.</p>
                <a class="btn" href="${resetUrl}">Reset password</a>
            `;
        } else if (resetOtp) {
            methodLabel = 'code';
            contentBlock = `
                <p>Enter the code below in the app to continue.</p>
                <div class="otp-box">
                    <div class="otp-label">One-time password</div>
                    <p class="otp-value">${resetOtp}</p>
                </div>
            `;
        }

        const rawHtml = await getTemplate('password-reset.template.html');
        const htmlContent = parseTemplate(rawHtml, {
            name,
            schoolName: displaySchool,
            expiresInText,
            contentBlock,
            methodLabel,
        });

        const textLines = [
            `Hello ${name},`,
            '',
            `We received a password reset request for your ${displaySchool} account.`,
            ''
        ];

        if (method !== 'link' && resetOtp) {
            textLines.push(`OTP code: ${resetOtp}`);
            textLines.push(`OTP expiry: ${expiresInText}`);
            textLines.push('');
        }

        if (method !== 'otp' && resetUrl) {
            textLines.push(`Reset link: ${resetUrl}`);
            textLines.push('');
        }

        textLines.push(`If you did not request this, you can safely ignore this email.`);

        const subject = method === 'otp'
            ? `Password Reset OTP - ${displaySchool}`
            : `Password Reset Request - ${displaySchool}`;

        const info = await transporter.sendMail({
            from: `"${displaySchool}" <${conf.SMTP_FROM || conf.SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
            text: textLines.join('\n'),
        });

        logger.info(`Password Reset Email Sent: ${info.messageId} to ${to} (method: ${method || 'both'})`);
        return { success: true };
    } catch (error) {
        logger.error(`Password Reset Email Failure: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const sendPasswordChangedEmail = async ({ to, name, schoolName, reason }) => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            logger.warn('[DEV] Password-changed email sending skipped.');
            logger.warn(`[DEV]   Recipient : ${to}`);
            logger.warn(`[DEV]   Name      : ${name}`);
            logger.warn(`[DEV]   Reason    : ${reason}`);
            return { success: true };
        }

        if (!conf.SMTP_USER || !conf.SMTP_PASS) {
            logger.warn('SMTP not configured. Password-changed email skipped.');
            return { success: false };
        }

        const displaySchool = schoolName || 'School Management System';
        const changedAt = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZoneName: 'short',
        });

        const rawHtml = await getTemplate('password-changed.template.html');
        const htmlContent = parseTemplate(rawHtml, {
            name,
            schoolName: displaySchool,
            changedAt,
            reason,
        });

        const text = [
            `Hello ${name},`,
            '',
            `Your password was changed for your ${displaySchool} account.`,
            `When: ${changedAt}`,
            `Method: ${reason}`,
            '',
            'If this was not you, contact your administrator immediately.'
        ].join('\n');

        const info = await transporter.sendMail({
            from: `"${displaySchool}" <${conf.SMTP_FROM || conf.SMTP_USER}>`,
            to,
            subject: `Password Updated - ${displaySchool}`,
            html: htmlContent,
            text,
        });

        logger.info(`Password Changed Email Sent: ${info.messageId} to ${to}`);
        return { success: true };
    } catch (error) {
        logger.error(`Password Changed Email Failure: ${error.message}`);
        return { success: false, error: error.message };
    }
};

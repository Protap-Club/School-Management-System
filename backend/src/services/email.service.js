/**
 * Email service for sending notifications
 * Uses Nodemailer with SMTP configuration
 */

import nodemailer from 'nodemailer';
import { conf } from '../config/index.js';

// Create transporter with SMTP config
const createTransporter = () => {
    console.log('📧 Creating email transporter with:');
    console.log('   Host:', conf.SMTP_HOST);
    console.log('   Port:', conf.SMTP_PORT);
    console.log('   User:', conf.SMTP_USER ? conf.SMTP_USER.substring(0, 5) + '***' : 'NOT SET');
    
    if (!conf.SMTP_USER || !conf.SMTP_PASS) {
        console.error('❌ SMTP credentials not set in .env file!');
        return null;
    }
    
    return nodemailer.createTransport({
        host: conf.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(conf.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: conf.SMTP_USER,
            pass: conf.SMTP_PASS
        }
    });
};

/**
 * Send welcome email with credentials to new user
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.name - User's name
 * @param {string} params.role - User's role
 * @param {string} params.password - Generated password
 */
export const sendCredentialsEmail = async ({ to, name, role, password }) => {
    try {
        console.log('📧 Attempting to send email to:', to);
        
        const transporter = createTransporter();
        
        if (!transporter) {
            console.error('❌ Transporter not created - check SMTP config');
            return { success: false, error: 'SMTP not configured' };
        }
        
        const roleDisplayName = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { padding: 30px; }
                    .credentials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .credentials p { margin: 10px 0; }
                    .label { color: #64748b; font-size: 14px; }
                    .value { color: #1e293b; font-weight: 600; font-size: 16px; font-family: monospace; background: #e0e7ff; padding: 4px 8px; border-radius: 4px; }
                    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
                    .role-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎓 Welcome to School Management System</h1>
                    </div>
                    <div class="content">
                        <p>Hello <strong>${name}</strong>,</p>
                        <p>Your account has been created successfully. You have been assigned the role of <span class="role-badge">${roleDisplayName}</span>.</p>
                        
                        <div class="credentials">
                            <p><span class="label">Email:</span><br><span class="value">${to}</span></p>
                            <p><span class="label">Password:</span><br><span class="value">${password}</span></p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                        </div>
                        
                        <p>You can now login to the portal using the credentials above.</p>
                        <p>If you have any questions, please contact your administrator.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from School Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: `"School Management System" <${conf.SMTP_FROM || conf.SMTP_USER}>`,
            to: to,
            subject: `Welcome to School Management System - Your ${roleDisplayName} Account`,
            html: htmlContent,
            text: `Welcome ${name}!\n\nYour account has been created with role: ${roleDisplayName}\n\nEmail: ${to}\nPassword: ${password}\n\nPlease change your password after first login.\n\nSchool Management System`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Credentials email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        // Don't throw - user creation should still succeed even if email fails
        return { success: false, error: error.message };
    }
};

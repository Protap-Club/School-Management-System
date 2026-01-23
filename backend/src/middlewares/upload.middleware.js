import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from "../config/logger.js"; // Import the logger

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the directory where uploaded logo files will be stored.
const logosDir = path.join(__dirname, '../../uploads/logos');

// Ensure the logos directory exists; create it if it doesn't.
if (!fs.existsSync(logosDir)) {
    logger.info(`Creating uploads directory: ${logosDir}`);
    fs.mkdirSync(logosDir, { recursive: true });
}

// Configure Multer's disk storage engine.
const storage = multer.diskStorage({
    // Define the destination directory for uploaded files.
    destination: (req, file, cb) => {
        cb(null, logosDir);
    },
    // Define the filename for the uploaded file.
    filename: (req, file, cb) => {
        // Construct a unique filename using school ID (if available), timestamp, and original extension.
        // This handles cases where schoolId might be an ObjectId or a string.
        const rawSchoolId = req.body?.schoolId || req.user?.schoolId;
        const schoolId = rawSchoolId?._id || rawSchoolId || 'unknown'; // Default to 'unknown' if no schoolId.
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase(); // Get original file extension.
        
        cb(null, `school_${schoolId}_${timestamp}${ext}`);
    }
});

// Define a file filter to restrict allowed file types.
const fileFilter = (req, file, cb) => {
    // Only allow specific image MIME types.
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file.
    } else {
        // Reject the file with an error message.
        logger.warn(`File upload rejected: Invalid file type ${file.mimetype}`);
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
    }
};

// Initialize Multer upload instance with storage, file filter, and size limits.
export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // Limit file size to 2MB.
});

/**
 * Utility function to delete a file from the file system.
 *
 * @param {string} filePath - The relative path to the file (e.g., '/uploads/logos/filename.png').
 * @returns {boolean} True if the file was deleted, false otherwise.
 */
export const deleteFile = (filePath) => {
    try {
        // Construct the full absolute path to the file.
        const fullPath = path.join(__dirname, '../..', filePath);
        
        // Check if the file exists before attempting to delete it.
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath); // Synchronously delete the file.
            logger.info(`File successfully deleted: ${fullPath}`);
            return true;
        } else {
            logger.warn(`Attempted to delete non-existent file: ${fullPath}`);
        }
    } catch (error) {
        // Log any errors that occur during file deletion.
        logger.error(`Error deleting file ${filePath}: ${error.message}`);
    }
    return false;
};

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define storage path
const logosDir = path.join(__dirname, '../../uploads/logos');

// Ensure directory exists 
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

// Configure Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logosDir),
    filename: (req, file, cb) => {
        // Prioritize Auth context, fallback to generic prefix
        const schoolId = req.user?.schoolId?._id || req.user?.schoolId || 'new';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        
        cb(null, `school_${schoolId}_${uniqueSuffix}${ext}`);
    }
});

// Validate File Type
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ValidationError('Invalid file type. Only JPG, PNG, and WEBP are allowed.'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Non-blocking file deletion utility
export const deleteFile = async (filePath) => {
    try {
        if (!filePath) return false;
        
        const fullPath = path.join(__dirname, '../..', filePath);
        
        // Check if file exists and delete it asynchronously
        await fs.promises.access(fullPath);
        await fs.promises.unlink(fullPath);
        
        logger.info(`File deleted successfully: ${filePath}`);
        return true;
    } catch (error) {
        // Ignore "File not found" errors, log others
        if (error.code !== 'ENOENT') {
            logger.error(`Error deleting file ${filePath}: ${error.message}`);
        }
        return false;
    }
};
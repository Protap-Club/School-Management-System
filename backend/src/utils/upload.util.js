// Upload Utility - Multer configuration for file uploads
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration for logos
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const schoolId = req.user?.schoolId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `school_${schoolId}_${timestamp}${ext}`);
    }
});

// File filter - only images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
    }
};

// Logo upload middleware (single file, max 2MB)
export const uploadLogo = multer({
    storage: logoStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
}).single('logo');

// Delete file utility
export const deleteFile = (filePath) => {
    try {
        const fullPath = path.join(__dirname, '../..', filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
    } catch (error) {
        console.error('Error deleting file:', error.message);
    }
    return false;
};

// Get default logo path
export const getDefaultLogoPath = () => '/resource/protap.png';

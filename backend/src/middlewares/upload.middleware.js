import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logos directory inside uploads
const logosDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, logosDir),
    filename: (req, file, cb) => {
        // Handle both populated object and plain ID
        const rawSchoolId = req.body?.schoolId || req.user?.schoolId;
        const schoolId = rawSchoolId?._id || rawSchoolId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `school_${schoolId}_${timestamp}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

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

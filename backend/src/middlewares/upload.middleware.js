import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";

// --- Cloudinary Storage for School Logos ---
const logoStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        // Namespace per school: schools/{schoolId}/logo
        const folder = req.schoolId ? `schools/${req.schoolId}/logo` : 'schools/default/logo';
        return {
            folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        };
    },
});

// Validate File Type
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ValidationError('Invalid file type. Only JPG, PNG, and WEBP are allowed.'), false);
    }
};

export const upload = multer({
    storage: logoStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for school logo
});


// --- Cloudinary Storage for User Avatars ---
const avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'users/avatars', // Namespace for user avatars
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
    },
});

export const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit for user avatars
});


// --- Cloudinary Deletion Utility ---
/**
 * Deletes a file from Cloudinary by its public_id.
 * Extracts the public_id from a full Cloudinary URL.
 * @param {string} cloudinaryUrl - The full Cloudinary URL (or old local path)
 */
export const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return false;

        // Skip deletion for old local paths (e.g., "/uploads/logos/...")
        if (cloudinaryUrl.startsWith('/uploads')) {
            logger.info(`Skipping deletion of legacy local path: ${cloudinaryUrl}`);
            return false;
        }

        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
        const parts = cloudinaryUrl.split('/upload/');
        if (parts.length < 2) {
            logger.warn(`Could not parse Cloudinary URL for deletion: ${cloudinaryUrl}`);
            return false;
        }

        // Remove version prefix (v1234567890/) and file extension
        const pathAfterUpload = parts[1];
        const publicId = pathAfterUpload
            .replace(/^v\d+\//, '')       // Remove version
            .replace(/\.[^.]+$/, '');      // Remove extension

        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            logger.info(`Cloudinary file deleted: ${publicId}`);
            return true;
        } else {
            logger.warn(`Cloudinary deletion returned: ${result.result} for ${publicId}`);
            return false;
        }
    } catch (error) {
        logger.error(`Error deleting from Cloudinary: ${error.message}`);
        return false;
    }
};
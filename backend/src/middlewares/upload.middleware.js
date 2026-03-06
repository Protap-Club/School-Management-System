import multer from 'multer';
import cloudinaryStorage from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";

// --- Cloudinary Storage for School Logos (Legacy v2.2.1) ---
const logoStorage = cloudinaryStorage({
    cloudinary: { v2: cloudinary },
    folder: function (req, file, cb) {
        const folder = req.schoolId ? `schools/${req.schoolId}/logo` : 'schools/default/logo';
        logger.info(`Logo storage folder: ${folder}`);
        cb(undefined, folder);
    },
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
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


// --- Cloudinary Storage for User Avatars (Legacy v2.2.1) ---
const avatarStorage = cloudinaryStorage({
    cloudinary: { v2: cloudinary },
    folder: 'users/avatars',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }]
});

export const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit for user avatars
});


// --- Cloudinary Deletion Utility ---
export const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return false;

        if (cloudinaryUrl.startsWith('/uploads')) {
            logger.info(`Skipping deletion of legacy local path: ${cloudinaryUrl}`);
            return false;
        }

        const parts = cloudinaryUrl.split('/upload/');
        if (parts.length < 2) {
            logger.warn(`Could not parse Cloudinary URL for deletion: ${cloudinaryUrl}`);
            return false;
        }

        // Detect resource_type from the URL segment BEFORE /upload/
        // e.g. "https://res.cloudinary.com/<cloud>/raw/upload/..."  → 'raw'
        //      "https://res.cloudinary.com/<cloud>/image/upload/..." → 'image'
        let resourceType = 'image'; // Cloudinary default
        if (parts[0].endsWith('/raw')) resourceType = 'raw';
        else if (parts[0].endsWith('/video')) resourceType = 'video';

        const pathAfterUpload = parts[1];
        let publicId = pathAfterUpload
            .replace(/^v\d+\//, '');  // strip version prefix if present

        // For raw files, the extension IS part of the public_id — do NOT strip it.
        // For image/video files, the extension is NOT part of the public_id.
        if (resourceType !== 'raw') {
            publicId = publicId.replace(/\.[^.]+$/, ''); // strip extension for image/video
        }

        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

        if (result.result === 'ok') {
            logger.info(`Cloudinary file deleted: ${publicId} (${resourceType})`);
            return true;
        } else {
            logger.warn(`Cloudinary deletion returned: ${result.result} for ${publicId} (${resourceType})`);
            return false;
        }
    } catch (error) {
        logger.error(`Error deleting from Cloudinary: ${error.message}`);
        return false;
    }
};
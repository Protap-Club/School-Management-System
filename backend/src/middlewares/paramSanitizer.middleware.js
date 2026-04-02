import mongoose from 'mongoose';
import { ValidationError } from '../utils/customError.js';

/**
 * Validates that all :id-style route params are valid MongoDB ObjectIds
 * and blocks path traversal characters in any route parameter.
 * 
 * Mitigates: CWE-22 Path Traversal via route parameters
 */
export const sanitizeParams = (req, res, next) => {
    for (const [key, value] of Object.entries(req.params)) {
        // Block path traversal characters in ANY route param
        if (typeof value === 'string' && (value.includes('..') || value.includes('\0'))) {
            throw new ValidationError(`Invalid characters in parameter '${key}'`);
        }

        // Validate ObjectId-style params
        if (key.toLowerCase().includes('id') && !mongoose.Types.ObjectId.isValid(value)) {
            throw new ValidationError(`Invalid parameter '${key}': must be a valid ObjectId`);
        }
    }
    next();
};

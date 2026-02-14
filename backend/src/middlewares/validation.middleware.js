import { z } from 'zod';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";

// Middleware to validate request data against Zod schema.

export const validate = (schema) => (req, res, next) => {
    try {
        // Validate all inputs strictly
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        // Handle Zod errors immediately to ensure consistent 400 format
        if (error instanceof z.ZodError) {
            // Zod uses 'issues' not 'errors'
            const errors = (error.issues || []).map(e => ({
                path: e.path.join('.'),
                message: e.message
            }));

            // Log full details for debugging
            logger.warn({
                msg: "Validation Failed",
                errors: errors
            });

            throw new ValidationError("Input validation failed", errors);
        }
        // Pass unexpected errors to global handler
        next(error);
    }
};
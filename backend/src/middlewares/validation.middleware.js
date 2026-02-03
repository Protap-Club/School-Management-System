import { z } from 'zod';
import logger from "../config/logger.js";

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
            logger.warn(`Validation Failed: ${JSON.stringify(errors)}`);

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }
        // Pass unexpected errors to global handler
        next(error);
    }
};
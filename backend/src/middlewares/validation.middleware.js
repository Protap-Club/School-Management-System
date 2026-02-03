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
            const errors = error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
            }));

            logger.warn(`Validation Failed: ${errors.map(e => e.message).join(", ")}`);

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
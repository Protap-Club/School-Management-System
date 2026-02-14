import { z } from 'zod';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";

// Middleware to validate request data against Zod schema.

export const validate = (schema) => (req, res, next) => {
    try {
        // Validate all inputs strictly
        const parsedData = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        // Assign parsed (and potentially transformed/defaulted) data back to req
        req.body = parsedData.body;
        req.query = parsedData.query;
        req.params = parsedData.params;

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
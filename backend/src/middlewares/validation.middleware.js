import { z } from 'zod';
import logger from "../config/logger.js"; // Import the logger

/**
 * Middleware factory to validate incoming request data (body, query, params) against a Zod schema.
 * This helps ensure data integrity and provides clear error messages for invalid requests.
 *
 * @param {z.ZodObject<any>} schema - The Zod schema to validate against. This schema should define
 *                                    the expected structure of `body`, `query`, and `params` properties.
 * @returns {Function} An Express middleware function that performs the validation.
 */
export const validate = (schema) => (req, res, next) => {
    try {
        // Attempt to parse and validate the relevant parts of the request against the schema.
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        logger.debug("Request data validated successfully by Zod schema.");
        next(); // If validation passes, proceed to the next middleware or route handler.
    } catch (error) {
        // If a ZodError occurs, it means validation failed.
        if (error instanceof z.ZodError) {
            logger.warn(`Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                // Map Zod errors into a more client-friendly format.
                errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
            });
        }
        // If it's not a ZodError, it's an unexpected error; forward it to the error handling middleware.
        logger.error(`Unexpected error during validation: ${error.message}`);
        next(error);
    }
};

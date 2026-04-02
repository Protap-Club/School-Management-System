import { z } from 'zod';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";
import { sanitizeInput } from "../utils/sanitize.js";

/**
 * Recursively sanitize all string values in an object.
 * Applied after Zod validation to strip HTML/XSS from user inputs.
 */
const deepSanitize = (obj) => {
    if (typeof obj === 'string') return sanitizeInput(obj);
    if (Array.isArray(obj)) return obj.map(deepSanitize);
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = deepSanitize(value);
        }
        return sanitized;
    }
    return obj;
};
// Middleware to validate request data against Zod schema.

export const validate = (schema) => (req, res, next) => {
    try {
        // Validate all inputs strictly
        const dataToParse = {
            body: req.body,
            query: req.query,
            params: req.params,
        };
        const parsedData = schema.parse(dataToParse);

        // Sanitize all string inputs to prevent stored XSS
        // Assign parsed (and potentially transformed/defaulted) data back to req
        req.body = parsedData.body ? deepSanitize(parsedData.body) : parsedData.body;
        // req.query and req.params are read-only in Express 5, so merge instead
        if (parsedData.query) Object.assign(req.query, parsedData.query);
        if (parsedData.params) Object.assign(req.params, parsedData.params);

        next();
    } catch (error) {
        // Handle Zod errors immediately to ensure consistent 400 format
        if (error instanceof z.ZodError) {
            // Zod uses 'issues' not 'errors'
            const errors = (error.issues || []).map(e => ({
                path: e.path.join('.'),
                message: e.message
            }));

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
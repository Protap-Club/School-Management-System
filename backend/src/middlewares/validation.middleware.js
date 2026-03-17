import { z } from 'zod';
import logger from "../config/logger.js";
import { ValidationError } from "../utils/customError.js";
import fs from 'fs';

// Middleware to validate request data against Zod schema.

export const validate = (schema) => (req, res, next) => {
    try {
        // Validate all inputs strictly
        const dataToParse = {
            body: req.body,
            query: req.query,
            params: req.params,
        };
        console.log("[VALIDATION_INPUT]", JSON.stringify(dataToParse, null, 2));
        const parsedData = schema.parse(dataToParse);

        // Assign parsed (and potentially transformed/defaulted) data back to req
        req.body = parsedData.body;
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

            // Log full details for debugging
            console.error("[VALIDATION_ERROR_DETAILS]", JSON.stringify(errors, null, 2));
            try {
                fs.writeFileSync('C:/Users/Jay/val_error.json', JSON.stringify({ errors, dataToParse }, null, 2));
            } catch (e) {}
            
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
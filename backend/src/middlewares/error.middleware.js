import logger from "../config/logger.js";
import { z } from "zod";


// Global Error Handler Middleware.
 
 
const errorHandler = (err, req, res, next) => {
    // Default Values
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errorData = err.data || null;
    let errorCode = err.code || "SERVER_ERROR";

    // Mongoose/MongoDB: Duplicate Key
    if (err.code === 11000) {
        statusCode = 409; // Conflict
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate value entered for ${field}. Please use another value.`;
        errorCode = "DUPLICATE_KEY";
    }

    // Mongoose: Invalid ID (CastError) 
    if (err.name === "CastError") {
        statusCode = 400; // Bad Request
        message = `Invalid format for ${err.path}: ${err.value}`;
        errorCode = "INVALID_ID";
    }

    // Mongoose: Validation Error 
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Database validation failed";
        errorCode = "DB_VALIDATION_ERROR";
        // Extract all validation messages into a clean object
        errorData = Object.values(err.errors).map((val) => val.message);
    }

    // JWT: Invalid Token 
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token. Please log in again.";
        errorCode = "INVALID_TOKEN";
    }

    // JWT: Expired Token 
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Your session has expired. Please log in again.";
        errorCode = "TOKEN_EXPIRED";
    }

    // Zod: Validation Error 
    if (err instanceof z.ZodError) {
        statusCode = 400;
        message = "Input validation failed";
        errorCode = "VALIDATION_ERROR";
        errorData = err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
        }));
    }

    // Logging 
    if (statusCode >= 500) {

        // Log "Critical" errors with full stack trace
        logger.error(`Server Error [${req.method} ${req.originalUrl}]: ${err.stack}`);
    } else {
        // Log "Operational" errors (400-499) as warnings without cluttering logs
        logger.warn(` Client Error [${statusCode}]: ${message}`);
    }

    // Construct Response
    const response = {
        success: false,
        message,
        code: errorCode,
        ...(errorData && { data: errorData }), // Only add 'data' if it exists
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }), // Security: Hide stack in prod
    };

    res.status(statusCode).json(response);
};

export default errorHandler;
import logger from "../config/logger.js";
import fs from 'fs';
import { z } from "zod";
import { AppError } from "../utils/customError.js";

// Normalize MongoDB/Mongoose errors into AppError instances

const handleMongoError = (err) => {
    // Duplicate Key Error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return new AppError(
            `Duplicate value '${value}' for field '${field}'. Please use another value.`,
            409,
            'DUPLICATE_KEY',
            { field, value }
        );
    }

    // Invalid ObjectId (CastError)
    if (err.name === 'CastError') {
        return new AppError(
            `Invalid ${err.kind} for field '${err.path}': '${err.value}'`,
            400,
            'INVALID_ID',
            { path: err.path, value: err.value, kind: err.kind }
        );
    }

    // Mongoose Validation Error
    // check if it is actually a mongoose validation error by checking for errors object
    if (err.name === 'ValidationError' && err.errors) {
        const errors = Object.entries(err.errors).map(([field, error]) => ({
            field,
            message: error.message,
            kind: error.kind,
            value: error.value
        }));

        return new AppError(
            'Database validation failed',
            400,
            'DB_VALIDATION_ERROR',
            errors
        );
    }

    return null;
};

//  Normalize JWT errors into AppError instances

const handleJWTError = (err) => {
    if (err.name === 'JsonWebTokenError') {
        return new AppError(
            'Invalid token. Please log in again.',
            401,
            'INVALID_TOKEN'
        );
    }

    if (err.name === 'TokenExpiredError') {
        return new AppError(
            'Your session has expired. Please log in again.',
            401,
            'TOKEN_EXPIRED',
            { expiredAt: err.expiredAt }
        );
    }

    return null;
};

// Normalize Zod validation errors into AppError instances

const handleZodError = (err) => {
    if (err instanceof z.ZodError) {
        const errors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
            ...(e.expected && { expected: e.expected }),
            ...(e.received && { received: e.received })
        }));

        return new AppError(
            'Input validation failed',
            422,
            'VALIDATION_ERROR',
            errors
        );
    }

    return null;
};

//  Log error with appropriate level based on severity

const logError = (err, req) => {
    const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id, // If authentication middleware sets req.user
        errorName: err.name,
        errorCode: err.code,
        message: err.message,
        statusCode: err.statusCode
    };

    // Critical server errors (5xx)
    if (err.statusCode >= 500) {
        logger.error({
            msg: 'Server Error',
            ...errorLog,
            stack: err.stack,
            data: err.data
        });
    }
    // Client errors (4xx) - less verbose
    else if (err.statusCode >= 400) {
        logger.warn({
            msg: 'Client Error',
            ...errorLog
        });
    }
    // Unexpected errors
    else {
        logger.error({
            msg: 'Unexpected Error',
            ...errorLog,
            stack: err.stack
        });
    }
};

// Determine if error should be reported to monitoring service (Sentry, etc.)

const shouldReport = (err) => {
    // Don't report operational/expected errors
    if (err.isOperational) {
        return false;
    }

    // Don't report client errors (4xx)
    if (err.statusCode >= 400 && err.statusCode < 500) {
        return false;
    }

    // Report all other errors
    return true;
};

// Send error to external monitoring service

const reportError = (err, req) => {
    if (!shouldReport(err)) {
        return;
    }

    // Example: Sentry integration
    // Sentry.captureException(err, {
    //     user: { id: req.user?.id },
    //     tags: {
    //         method: req.method,
    //         url: req.originalUrl
    //     }
    // });

    // For now, just log that we would report it
    logger.error({
        msg: 'Error would be reported to monitoring service',
        error: err.message,
        code: err.code
    });
};

//  Global Error Handler Middleware
//  Catches all errors and sends appropriate response

const errorHandler = (err, req, res, next) => {
    try {
        fs.writeFileSync('C:/Users/Jay/School-Management-System/global_error.json', JSON.stringify({
            message: err.message,
            stack: err.stack,
            name: err.name,
            statusCode: err.statusCode,
            data: err.data,
            body: req.body,
            params: req.params,
            url: req.url
        }, null, 2));
    } catch (e) {}

    let error = err;

    // 1. Check if it's already an AppError (our custom error)
    if (err instanceof AppError) {
        // It's already our desired format, so just use it.
        // potentially add default operational status if missing
        error = err;
    } else {
        // 2. Try to normalize known error types
        const mongoError = handleMongoError(err);
        if (mongoError) {
            error = mongoError;
        } else {
            const jwtError = handleJWTError(err);
            if (jwtError) {
                error = jwtError;
            } else {
                const zodError = handleZodError(err);
                if (zodError) {
                    error = zodError;
                }
            }
        }
    }

    // 3. Fallback: If still not an AppError, wrap it as an internal server error
    if (!(error instanceof AppError)) {
        error = new AppError(
            error.message || 'Internal Server Error',
            error.statusCode || 500,
            error.code || 'INTERNAL_ERROR',
            error.data || null,
            false // Unknown errors are not operational
        );
        // Preserve stack trace of original error
        error.stack = err.stack;
    }

    // Log the error
    logError(error, req);

    // Report critical errors to monitoring service
    reportError(error, req);

    // Construct response
    const response = {
        success: false,
        error: {
            message: error.message,
            code: error.code,
            ...(error.data && { details: error.data }),
            timestamp: error.timestamp
        }
    };

    // Include stack trace in development only
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = error.stack;
    }

    // Send response
    res.status(error.statusCode).json(response);
};

//  404 Not Found Handler
//  Should be placed after all routes

export const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Cannot ${req.method} ${req.originalUrl}`,
        404,
        'ROUTE_NOT_FOUND',
        {
            method: req.method,
            path: req.originalUrl
        }
    );
    next(error);
};

//   Async Handler Wrapper
//   Wraps async route handlers to catch errors automatically

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default errorHandler;
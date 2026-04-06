//  Base Custom Error Class
//  All application errors should extend from this

export class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', data = null, isOperational = true) {
        super(message);

        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.data = data;
        this.isOperational = isOperational; // Distinguishes operational vs programming errors
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        // Maintain prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
    }

    // Serialize error for logging/response

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            data: this.data,
            timestamp: this.timestamp,
            ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
        };
    }

    // Alias for consistent serialization
    serialize() {
        return this.toJSON();
    }
}

//  400 Bad Request - Client sent invalid data

export class BadRequestError extends AppError {
    constructor(message = 'Bad Request', code = 'BAD_REQUEST', data = null) {
        super(message, 400, code, data);
    }
}

// 401 Unauthorized - Authentication required or failed

export class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required', code = 'UNAUTHORIZED', data = null) {
        super(message, 401, code, data);
    }
}

// 403 Forbidden - Authenticated but not authorized

export class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden', code = 'FORBIDDEN', data = null) {
        super(message, 403, code, data);
    }
}

// 404 Not Found - Resource doesn't exist

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND', data = null) {
        super(message, 404, code, data);
    }
}

// 409 Conflict - Request conflicts with current state

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict', code = 'CONFLICT', data = null) {
        super(message, 409, code, data);
    }
}

// 422 Unprocessable Entity - Validation failed

export class ValidationError extends AppError {
    constructor(message = 'Validation failed', data = null, code = 'VALIDATION_ERROR') {
        super(message, 422, code, data);
    }
}

// 429 Too Many Requests - Rate limit exceeded

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests', code = 'RATE_LIMIT_EXCEEDED', data = null) {
        super(message, 429, code, data);
    }
}

// 500 Internal Server Error - Unexpected server error

export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', code = 'INTERNAL_ERROR', data = null) {
        super(message, 500, code, data, false); // Not operational
    }
}

// 503 Service Unavailable - External service down

export class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE', data = null) {
        super(message, 503, code, data);
    }
}
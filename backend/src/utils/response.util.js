/**
 * Response Utility - Standardized API response helpers
 * Reduces code duplication across all controllers
 */

/**
 * Send error response
 */
export const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({ success: false, message });
};

/**
 * Send success response
 */
export const sendSuccess = (res, data = null, message = null, statusCode = 200) => {
    const response = { success: true };
    if (message) response.message = message;
    if (data !== null) response.data = data;
    return res.status(statusCode).json(response);
};

/**
 * Send success response with pagination
 */
export const sendPaginated = (res, data, pagination, message = null) => {
    const response = { success: true, data, pagination };
    if (message) response.message = message;
    return res.status(200).json(response);
};

/**
 * Common error codes
 */
export const HTTP = Object.freeze({
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    SERVER_ERROR: 500
});

/**
 * Common error messages
 */
export const MESSAGES = Object.freeze({
    SERVER_ERROR: "Internal Server Error",
    UNAUTHORIZED: "Authentication required",
    FORBIDDEN: "Access denied",
    NOT_FOUND: "Resource not found"
});

// asyncHandler.js - Utility to catch errors from async Express route handlers

/**
 * Wraps an async function and catches any errors, passing them to the 'next' middleware.
 * This avoids the need for repetitive try-catch blocks in every async controller.
 *
 * @param {Function} fn The async function to execute (e.g., a controller).
 * @returns {Function} A new function that can be used as an Express route handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
    // Wrap the async function call in a Promise
    // If the promise resolves, the request is handled
    // If it rejects, the error is caught and passed to 'next()'
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

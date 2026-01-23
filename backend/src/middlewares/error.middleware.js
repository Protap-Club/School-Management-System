// Centralized error handler middleware

const errorHandler = (err, req, res, next) => {
    // Log the error for debugging purposes
    console.error(`❌ [ERROR] ${new Date().toISOString()}`);
    console.error('  Message:', err.message);
    console.error('  Stack:', err.stack);
    if (err.code) console.error('  Code:', err.code);
    if (err.data) console.error('  Data:', JSON.stringify(err.data, null, 2));

    // Determine status code - use err.statusCode if it's a custom error, otherwise default to 500
    const statusCode = err.statusCode || 500;

    // Prepare the response body
    const responseBody = {
        success: false,
        message: err.message || "An unexpected error occurred on the server.",
    };

    // Add optional fields if they exist
    if (err.code) {
        responseBody.code = err.code;
    }
    if (err.data) {
        responseBody.data = err.data;
    }

    // In development, include the stack trace for easier debugging
    // Be careful not to expose this in production
    if (process.env.NODE_ENV === 'development' && statusCode === 500) {
        responseBody.stack = err.stack;
    }

    // Send the response
    res.status(statusCode).json(responseBody);
};

export default errorHandler;

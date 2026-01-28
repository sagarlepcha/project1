/**
 * Global Error Handler Middleware
 * Catches all errors and returns appropriate responses
 * Prevents server crashes from unhandled errors
 */
function errorHandler(err, req, res, next) {
    // Log the error with timestamp
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ERROR in ${req.method} ${req.originalUrl}`);
    console.error(`   Name: ${err.name}`);
    console.error(`   Message: ${err.message}`);
    if (process.env.DEBUG === 'true') {
        console.error(`   Stack: ${err.stack}`);
    }

    // Prevent sending response if headers already sent
    if (res.headersSent) {
        return next(err);
    }

    // JWT Authentication Error
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Authentication Error',
            message: 'The user is not authorized. Please login again.',
            code: 'UNAUTHORIZED'
        });
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map((e) => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: messages.length > 0 ? messages.join(', ') : err.message,
            code: 'VALIDATION_ERROR'
        });
    }

    // Mongoose Cast Error (Invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID',
            message: `Invalid ${err.path}: ${err.value}`,
            code: 'INVALID_ID'
        });
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(409).json({
            success: false,
            error: 'Duplicate Entry',
            message: `A record with this ${field} already exists.`,
            code: 'DUPLICATE_KEY'
        });
    }

    // Multer File Upload Error
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            error: 'File Upload Error',
            message: err.message,
            code: 'UPLOAD_ERROR'
        });
    }

    // Syntax Error (Invalid JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON',
            message: 'The request body contains invalid JSON.',
            code: 'INVALID_JSON'
        });
    }

    // MongoDB Connection Error
    if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
        return res.status(503).json({
            success: false,
            error: 'Database Error',
            message: 'Unable to connect to the database. Please try again later.',
            code: 'DB_CONNECTION_ERROR'
        });
    }

    // Default to 500 server error
    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
        success: false,
        error: 'Server Error',
        message:
            process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred. Please try again later.'
                : err.message,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

module.exports = errorHandler;

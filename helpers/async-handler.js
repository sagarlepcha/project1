/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * and pass them to the global error handler
 *
 * Usage:
 * const asyncHandler = require('../helpers/async-handler');
 * router.get('/', asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

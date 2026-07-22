/**
 * Centralized Error Handling Middleware
 * 
 * Catches all unhandled errors and returns a standardized error response format:
 * {
 *   error: { code, message, details, traceId }
 * }
 * 
 * This middleware must be registered LAST in the middleware chain.
 */

const crypto = require('crypto');

/**
 * Custom application error class with HTTP status code support.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error handler - catches requests that don't match any route.
 * Should be registered after all routes but before the error handler.
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler middleware.
 * Formats all errors into a standardized response.
 */
function errorHandler(err, req, res, next) {
  // Generate a trace ID for error correlation
  const traceId = req.traceId || req.headers['x-request-id'] || crypto.randomUUID();

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'SyntaxError' && err.status === 400) {
    // JSON parse errors
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
    details = null;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  }

  // Don't expose internal error details in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred';
    details = null;
  }

  // Log error (structured for observability)
  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    level: statusCode >= 500 ? 'error' : 'warn',
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message: err.message,
    stack: statusCode >= 500 ? err.stack : undefined
  };

  if (statusCode >= 500) {
    console.error(JSON.stringify(logEntry));
  } else {
    console.warn(JSON.stringify(logEntry));
  }

  // Send standardized error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      details,
      traceId
    }
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };

/**
 * Rate limiting middleware for authentication endpoints.
 * Protects login/register endpoints from brute-force attacks.
 * 
 * Configuration:
 * - AUTH_RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - AUTH_RATE_LIMIT_MAX: Maximum requests per window (default: 10)
 */

const rateLimit = require('express-rate-limit');

// Rate limiter specifically for authentication endpoints
const authRateLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: undefined
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: retryAfterSeconds
    });
  },
  keyGenerator: (req) => {
    // Use IP address as the key for rate limiting
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// General API rate limiter (less restrictive)
const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX, 10) || 100, // 100 requests per minute
  message: {
    error: 'Too many requests. Please slow down.',
    retryAfter: undefined
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: retryAfterSeconds
    });
  }
});

module.exports = { authRateLimiter, generalRateLimiter };

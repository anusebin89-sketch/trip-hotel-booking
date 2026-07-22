/**
 * CORS Configuration Module
 * 
 * Provides an allowlist-based CORS policy for production deployments.
 * In development: permissive settings for local development.
 * In production: only approved origins can call the API.
 * 
 * Configuration via environment variables:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins
 * - CORS_ALLOWED_METHODS: Comma-separated list of allowed HTTP methods
 * - CORS_ALLOWED_HEADERS: Comma-separated list of allowed headers
 * - CORS_MAX_AGE: Preflight cache duration in seconds
 */

function getCorsConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Parse allowed origins from environment variable
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  // Default development origins
  const devOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000'
  ];

  const origins = isProduction ? allowedOrigins : [...devOrigins, ...allowedOrigins];

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (same-origin, curl, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (origins.length === 0 && !isProduction) {
        // In development with no configured origins, allow all
        return callback(null, true);
      }

      if (origins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // Reject non-allowlisted origins
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    },
    methods: process.env.CORS_ALLOWED_METHODS
      ? process.env.CORS_ALLOWED_METHODS.split(',').map(m => m.trim())
      : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS
      ? process.env.CORS_ALLOWED_HEADERS.split(',').map(h => h.trim())
      : ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    credentials: true, // Allow cookies/session to be sent
    maxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 86400, // 24 hours preflight cache
    optionsSuccessStatus: 204
  };
}

module.exports = { getCorsConfig };

/**
 * Session Configuration Module
 * 
 * Provides secure session configuration based on the current environment.
 * In production: secure cookies, sameSite strict, secrets from environment.
 * In development: relaxed settings for local development convenience.
 */

function getSessionConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Session secret must be sourced from environment in production
  const sessionSecret = process.env.SESSION_SECRET || (isProduction
    ? (() => { throw new Error('SESSION_SECRET environment variable is required in production'); })()
    : 'stayred-dev-secret-key-2024');

  return {
    secret: sessionSecret,
    name: process.env.SESSION_COOKIE_NAME || 'stayred.sid',
    resave: false,
    saveUninitialized: false,
    proxy: isProduction, // Trust reverse proxy in production
    cookie: {
      secure: isProduction, // Only send cookie over HTTPS in production
      httpOnly: true, // Prevent client-side JS access
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 24 * 60 * 60 * 1000, // 24 hours default
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      path: '/'
    }
  };
}

module.exports = { getSessionConfig };

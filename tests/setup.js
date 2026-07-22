/**
 * Test Setup
 * 
 * Creates an Express app instance configured for testing.
 * Uses a separate test database to avoid corrupting development data.
 */

const express = require('express');
const session = require('express-session');
const path = require('path');

function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: 'test-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Routes
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/hotels', require('../routes/hotels'));
  app.use('/api/bookings', require('../routes/bookings'));

  return app;
}

module.exports = { createTestApp };

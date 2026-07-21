
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'stayred-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/bookings', require('./routes/bookings'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  // Handle Joi validation errors that might bubble up
  if (err && err.isJoi) {
    const details = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, "'")
    }));
    return res.status(400).json({
      error: 'Validation failed',
      statusCode: 400,
      details
    });
  }

  // Handle unexpected errors
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500
  });
});

// Auto-seed on first run
require('./seed');

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🏨  StayRed is running at http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop.\n`);
  });
}

module.exports = app;
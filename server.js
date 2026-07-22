const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { getCorsConfig } = require('./config/cors');

const app = express();
const PORT = process.env.PORT || 8080;

// CORS - must be before other middleware
app.use(cors(getCorsConfig()));

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

// Auto-seed on first run
require('./seed');

app.listen(PORT, () => {
  console.log(`\n🏨  StayRed is running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { getSessionConfig } = require('./config/session');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session with secure configuration
app.use(session(getSessionConfig()));

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
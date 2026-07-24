const express = require('express');
const bcrypt = require('bcryptjs');
const { UserRepository: db } = require('../database/repository');

const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { resetEmail } = require('../services/emailResetService');
const { increment } = require('../middleware/monitor');
const { validateResetEmail } = require('../middleware/validation');
const { validateResetEmail } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (db.emailExists(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = db.create(name, email, hashed);

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.status(201).json({ message: 'Account created successfully.', user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.json({ message: 'Logged in successfully.', user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully.' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ user: null });
  }
  const user = db.findById(req.session.userId);
  res.json({ user: user || null });
});

// POST /api/auth/reset-email
router.post('/reset-email', requireAuth, validateResetEmail, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { currentPassword, newEmail } = req.body;
    const updated = await resetEmail({ userId, currentPassword, newEmail });
    increment('email_reset.success');
    res.json({ message: 'Email updated successfully.', user: updated });
  } catch (err) {
    increment('email_reset.failure');
    next(err);
  }
});

module.exports = router;

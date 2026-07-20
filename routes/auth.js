const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (db.userEmailExists(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = db.createUser(name, email, hashed);

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.status(201).json({ message: 'Account created successfully.', user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.findUserByEmail(email);
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
  const user = db.findUserById(req.session.userId);
  res.json({ user: user || null });
});

module.exports = router;

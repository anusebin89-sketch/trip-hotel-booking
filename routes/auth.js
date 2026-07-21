
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.schemas');

const router = express.Router();

router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  if (db.userEmailExists(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = db.createUser(name, email, hashed);

  req.session.userId = user.id;
  req.session.userName = user.name;

  res.status(201).json({ message: 'Account created successfully.', user: { id: user.id, name: user.name, email: user.email } });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

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
const EMAIL_MAX_LENGTH = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateResetEmail(req, res, next) {
  const { currentPassword, newEmail } = req.body || {};

  if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
    const err = new Error('Current password is required.');
    err.status = 400;
    return next(err);
  }

  if (!newEmail || typeof newEmail !== 'string' || newEmail.trim() === '') {
    const err = new Error('New email is required.');
    err.status = 400;
    return next(err);
  }

  if (newEmail.length > EMAIL_MAX_LENGTH) {
    const err = new Error(`Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`);
    err.status = 400;
    return next(err);
  }

  if (!EMAIL_REGEX.test(newEmail)) {
    const err = new Error('Invalid email format.');
    err.status = 400;
    return next(err);
  }

  // sanitize
  req.body.currentPassword = currentPassword;
  req.body.newEmail = newEmail.trim();

  next();
}

module.exports = { validateResetEmail };
const EMAIL_MAX_LENGTH = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateResetEmail(req, res, next) {
  const { currentPassword, newEmail } = req.body;
  if (!currentPassword || !newEmail) {
    return res.status(400).json({ error: 'Current password and new email are required.' });
  }
  if (typeof newEmail !== 'string' || newEmail.length === 0 || newEmail.length > EMAIL_MAX_LENGTH) {
    return res.status(400).json({ error: `Email must be 1-${EMAIL_MAX_LENGTH} characters.` });
  }
  if (!EMAIL_REGEX.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  next();
}

module.exports = { validateResetEmail };

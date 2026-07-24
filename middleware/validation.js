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

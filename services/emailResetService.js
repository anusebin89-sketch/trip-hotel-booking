const bcrypt = require('bcryptjs');
const { UserRepository: UserRepo } = require('../database/repository');

const EMAIL_MAX_LENGTH = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resetEmail({ userId, currentPassword, newEmail }) {
  if (!currentPassword || !newEmail) {
    const err = new Error('Current password and new email are required.');
    err.status = 400;
    throw err;
  }

  if (newEmail.length > EMAIL_MAX_LENGTH) {
    const err = new Error(`Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }

  if (!EMAIL_REGEX.test(newEmail)) {
    const err = new Error('Invalid email format.');
    err.status = 400;
    throw err;
  }

  // Fetch raw user (includes password hash)
  const user = UserRepo.findByIdRaw(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    const err = new Error('Current password is incorrect.');
    err.status = 401;
    throw err;
  }

  // Check duplicate email
  const existing = UserRepo.findByEmail(newEmail);
  if (existing && existing.id !== user.id) {
    const err = new Error('The provided email is already in use.');
    err.status = 409;
    throw err;
  }

  // Perform update
  const updated = UserRepo.updateEmail(user.id, newEmail);
  if (!updated) {
    const err = new Error('Failed to update email due to server error.');
    err.status = 500;
    throw err;
  }

  return updated;
}

module.exports = { resetEmail };

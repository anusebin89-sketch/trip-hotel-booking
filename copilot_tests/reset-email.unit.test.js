jest.mock('../database/repository', () => ({
  UserRepository: {
    findByIdRaw: jest.fn(),
    findByEmail: jest.fn(),
    updateEmail: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

const { UserRepository } = require('../database/repository');
const bcrypt = require('bcryptjs');
const { resetEmail } = require('../services/emailResetService');

describe('emailResetService.resetEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('succeeds when current password matches and email not in use', async () => {
    const mockUser = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'hashed' };
    UserRepository.findByIdRaw.mockReturnValue(mockUser);
    UserRepository.findByEmail.mockReturnValue(null);
    UserRepository.updateEmail.mockReturnValue({ id: 1, name: 'Alice', email: 'new@example.com' });
    bcrypt.compare.mockResolvedValue(true);

    const result = await resetEmail({ userId: 1, currentPassword: 'secret', newEmail: 'new@example.com' });
    expect(result).toEqual({ id: 1, name: 'Alice', email: 'new@example.com' });
    expect(UserRepository.updateEmail).toHaveBeenCalledWith(1, 'new@example.com');
  });

  test('fails when current password is incorrect', async () => {
    const mockUser = { id: 2, name: 'Bob', email: 'bob@example.com', password: 'hashed' };
    UserRepository.findByIdRaw.mockReturnValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(resetEmail({ userId: 2, currentPassword: 'wrong', newEmail: 'bob2@example.com' }))
      .rejects.toMatchObject({ message: 'Current password is incorrect.' });
  });

  test('fails when new email is already used by another account', async () => {
    const mockUser = { id: 3, name: 'Carol', email: 'carol@example.com', password: 'hashed' };
    const otherUser = { id: 4, name: 'Other', email: 'other@example.com' };
    UserRepository.findByIdRaw.mockReturnValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    UserRepository.findByEmail.mockReturnValue(otherUser);

    await expect(resetEmail({ userId: 3, currentPassword: 'secret', newEmail: 'other@example.com' }))
      .rejects.toMatchObject({ message: 'The provided email is already in use.' });
  });
});

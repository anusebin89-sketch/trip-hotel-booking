// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for Auth API endpoints:
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

test.describe('Auth API Integration', () => {
  const BASE_URL = 'http://localhost:8080';
  const uniqueEmail = () => `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  test.describe('POST /api/auth/register', () => {
    test('should register a new user and return 201 with user data', async ({ request }) => {
      const email = uniqueEmail();
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          name: 'Test User',
          email: email,
          password: 'password123',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('Account created successfully.');
      expect(body.user).toHaveProperty('id');
      expect(body.user.name).toBe('Test User');
      expect(body.user.email).toBe(email.toLowerCase());
    });

    test('should set session cookie on successful registration', async ({ request }) => {
      const email = uniqueEmail();
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          name: 'Session Test',
          email: email,
          password: 'password123',
        },
      });

      expect(response.status()).toBe(201);
      const cookies = response.headers()['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies).toContain('connect.sid');
    });

    test('should return 400 when name is missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          email: uniqueEmail(),
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Name, email, and password are required.');
    });

    test('should return 400 when email is missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          name: 'Test',
          password: 'password123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Name, email, and password are required.');
    });

    test('should return 400 when password is missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          name: 'Test',
          email: uniqueEmail(),
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Name, email, and password are required.');
    });

    test('should return 400 when password is less than 6 characters', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: {
          name: 'Test',
          email: uniqueEmail(),
          password: '12345',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Password must be at least 6 characters.');
    });

    test('should return 409 when email already exists', async ({ request }) => {
      const email = uniqueEmail();

      // Register first time
      await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'First', email: email, password: 'password123' },
      });

      // Attempt duplicate
      const response = await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'Second', email: email, password: 'password456' },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('An account with this email already exists.');
    });
  });

  test.describe('POST /api/auth/login', () => {
    let testEmail;

    test.beforeAll(async ({ request }) => {
      testEmail = uniqueEmail();
      await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'Login Test User', email: testEmail, password: 'secret123' },
      });
    });

    test('should login successfully with valid credentials', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: testEmail, password: 'secret123' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Logged in successfully.');
      expect(body.user.email).toBe(testEmail.toLowerCase());
      expect(body.user.name).toBe('Login Test User');
    });

    test('should return 400 when email is missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { password: 'secret123' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Email and password are required.');
    });

    test('should return 400 when password is missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: testEmail },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Email and password are required.');
    });

    test('should return 401 for non-existent email', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: 'nonexistent@test.com', password: 'secret123' },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid email or password.');
    });

    test('should return 401 for wrong password', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { email: testEmail, password: 'wrongpassword' },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Invalid email or password.');
    });
  });

  test.describe('GET /api/auth/me', () => {
    test('should return user null when not authenticated', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/auth/me`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.user).toBeNull();
    });

    test('should return user data when authenticated', async ({ request }) => {
      const email = uniqueEmail();
      // Register to establish session
      await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'Me Test', email: email, password: 'password123' },
      });

      // Check session
      const response = await request.get(`${BASE_URL}/api/auth/me`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.user).not.toBeNull();
      expect(body.user.name).toBe('Me Test');
      expect(body.user.email).toBe(email.toLowerCase());
      expect(body.user).not.toHaveProperty('password');
    });
  });

  test.describe('POST /api/auth/logout', () => {
    test('should destroy session and return success', async ({ request }) => {
      const email = uniqueEmail();
      // Register
      await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'Logout Test', email: email, password: 'password123' },
      });

      // Logout
      const logoutRes = await request.post(`${BASE_URL}/api/auth/logout`);
      expect(logoutRes.status()).toBe(200);
      const logoutBody = await logoutRes.json();
      expect(logoutBody.message).toBe('Logged out successfully.');

      // Verify session is destroyed
      const meRes = await request.get(`${BASE_URL}/api/auth/me`);
      const meBody = await meRes.json();
      expect(meBody.user).toBeNull();
    });
  });

  test.describe('Session persistence across requests', () => {
    test('session persists after login for subsequent API calls', async ({ request }) => {
      const email = uniqueEmail();
      await request.post(`${BASE_URL}/api/auth/register`, {
        data: { name: 'Persist Test', email: email, password: 'password123' },
      });

      // Multiple /me calls should all return the user
      for (let i = 0; i < 3; i++) {
        const res = await request.get(`${BASE_URL}/api/auth/me`);
        const body = await res.json();
        expect(body.user).not.toBeNull();
        expect(body.user.name).toBe('Persist Test');
      }
    });
  });
});

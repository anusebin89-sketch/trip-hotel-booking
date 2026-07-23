const { test, expect, request } = require('@playwright/test');

const BASE = 'http://localhost:8080';
const unique = () => `user_${Date.now()}@test.com`;

test.describe('EPMCDMETST-55141 | Authentication flows', () => {

  test('register a new user and receive 201', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Test User', email: unique(), password: 'pass1234' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('email');
  });

  test('reject registration with missing fields (400)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { email: unique() },
    });
    expect(res.status()).toBe(400);
  });

  test('reject registration with short password (400)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'A', email: unique(), password: '123' },
    });
    expect(res.status()).toBe(400);
  });

  test('reject duplicate email registration (409)', async ({ request }) => {
    const email = unique();
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'First', email, password: 'pass1234' },
    });
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Second', email, password: 'pass1234' },
    });
    expect(res.status()).toBe(409);
  });

  test('login with correct credentials returns 200', async ({ request }) => {
    const email = unique();
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'Login User', email, password: 'pass1234' },
    });
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'pass1234' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('message');
  });

  test('reject login with wrong password (401)', async ({ request }) => {
    const email = unique();
    await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'User', email, password: 'pass1234' },
    });
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email, password: 'wrongpass' },
    });
    expect(res.status()).toBe(401);
  });

  test('reject login with unknown email (401)', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'nobody@nowhere.com', password: 'pass1234' },
    });
    expect(res.status()).toBe(401);
  });

});

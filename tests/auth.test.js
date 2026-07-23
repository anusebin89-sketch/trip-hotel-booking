const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');

const DB_PATH = path.join(__dirname, '../database/stayred.json');

function resetDb() {
  const seed = { users: [], hotels: [], bookings: [], _seq: { users: 0, hotels: 0, bookings: 0 } };
  fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
}

beforeEach(resetDb);
afterAll(resetDb);

describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'pass123' });
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice2', email: 'alice@test.com', password: 'pass123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'pass123' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@test.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns null user when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});

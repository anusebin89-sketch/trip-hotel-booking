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

describe('POST /api/auth/reset-email', () => {
  it('rejects when not authenticated', async () => {
    const res = await request(app).post('/api/auth/reset-email').send({ currentPassword: 'x', newEmail: 'a@b.com' });
    expect(res.status).toBe(401);
  });

  it('rejects incorrect current password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'A', email: 'a@b.com', password: 'pass123' });
    // attempt with wrong password
    const res = await agent.post('/api/auth/reset-email').send({ currentPassword: 'wrong', newEmail: 'new@b.com' });
    expect(res.status).toBe(401);
  });

  it('rejects duplicate email', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'A', email: 'a@b.com', password: 'pass123' });
    await agent.post('/api/auth/register').send({ name: 'B', email: 'b@b.com', password: 'pass123' });
    // login as A
    await agent.post('/api/auth/login').send({ email: 'a@b.com', password: 'pass123' });
    const res = await agent.post('/api/auth/reset-email').send({ currentPassword: 'pass123', newEmail: 'b@b.com' });
    expect(res.status).toBe(409);
  });

  it('updates email when validated', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'A', email: 'a@b.com', password: 'pass123' });
    await agent.post('/api/auth/login').send({ email: 'a@b.com', password: 'pass123' });
    const res = await agent.post('/api/auth/reset-email').send({ currentPassword: 'pass123', newEmail: 'updated@b.com' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('updated@b.com');
  });
});

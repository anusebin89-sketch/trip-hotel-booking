const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const db = require('../database/db');

const DB_PATH = path.join(__dirname, '../database/stayred.json');

function resetDb() {
  const seed = { users: [], hotels: [], bookings: [], _seq: { users: 0, hotels: 0, bookings: 0 } };
  fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
}

async function loginAgent() {
  const agent = request.agent(app);
  await agent.post('/api/auth/register')
    .send({ name: 'Alice', email: 'alice@test.com', password: 'pass123' });
  return agent;
}

beforeEach(() => {
  resetDb();
  db.insertHotelsBulk([
    { name: 'Ocean View', location: 'Miami', price_per_night: 150, image_url: '', rating: 4.5, amenities: [] },
  ]);
});
afterAll(resetDb);

const validBooking = {
  hotelId: 1,
  guestName: 'Alice',
  checkIn: '2026-09-01',
  checkOut: '2026-09-05',
  guests: 2,
  cardNumber: '4242424242424242',
  cardName: 'Alice Test',
  expiry: '12/28',
  cvv: '123',
};

describe('POST /api/bookings', () => {
  it('creates a booking when authenticated', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/api/bookings').send(validBooking);
    expect(res.status).toBe(201);
    expect(res.body.booking.total_price).toBe(600);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/bookings').send(validBooking);
    expect(res.status).toBe(401);
  });

  it('rejects declined card with 402', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/api/bookings').send({ ...validBooking, cardNumber: '1111111111111111' });
    expect(res.status).toBe(402);
  });

  it('rejects invalid dates with 400', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/api/bookings').send({ ...validBooking, checkIn: '2026-09-05', checkOut: '2026-09-01' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/bookings/my', () => {
  it('returns bookings for logged-in user', async () => {
    const agent = await loginAgent();
    await agent.post('/api/bookings').send(validBooking);
    const res = await agent.get('/api/bookings/my');
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/bookings/my');
    expect(res.status).toBe(401);
  });
});

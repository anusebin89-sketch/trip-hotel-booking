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

beforeEach(() => {
  resetDb();
  db.insertHotelsBulk([
    { name: 'Ocean View', location: 'Miami', price_per_night: 150, image_url: '', rating: 4.5, amenities: [] },
    { name: 'Mountain Inn', location: 'Denver', price_per_night: 100, image_url: '', rating: 4.0, amenities: [] },
  ]);
});
afterAll(resetDb);

describe('GET /api/hotels', () => {
  it('returns all hotels', async () => {
    const res = await request(app).get('/api/hotels');
    expect(res.status).toBe(200);
    expect(res.body.hotels).toHaveLength(2);
  });

  it('filters by location', async () => {
    const res = await request(app).get('/api/hotels?location=Miami');
    expect(res.status).toBe(200);
    expect(res.body.hotels).toHaveLength(1);
    expect(res.body.hotels[0].location).toBe('Miami');
  });
});

describe('GET /api/hotels/:id', () => {
  it('returns a hotel by id', async () => {
    const res = await request(app).get('/api/hotels/1');
    expect(res.status).toBe(200);
    expect(res.body.hotel.name).toBe('Ocean View');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/hotels/999');
    expect(res.status).toBe(404);
  });
});

const request = require('supertest');
const { createTestApp } = require('./setup');

const app = createTestApp();

describe('Hotels API Endpoints', () => {
  describe('GET /api/hotels', () => {
    it('should return a list of hotels', async () => {
      const res = await request(app)
        .get('/api/hotels')
        .expect(200);

      expect(res.body).toHaveProperty('hotels');
      expect(Array.isArray(res.body.hotels)).toBe(true);
    });

    it('should filter hotels by location', async () => {
      const res = await request(app)
        .get('/api/hotels?location=Paris')
        .expect(200);

      expect(res.body).toHaveProperty('hotels');
      expect(Array.isArray(res.body.hotels)).toBe(true);
      if (res.body.hotels.length > 0) {
        res.body.hotels.forEach(hotel => {
          expect(hotel.location.toLowerCase()).toBe('paris');
        });
      }
    });

    it('should return empty array for non-existent location', async () => {
      const res = await request(app)
        .get('/api/hotels?location=NonExistentCity')
        .expect(200);

      expect(res.body.hotels).toEqual([]);
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should return a hotel by valid ID', async () => {
      const res = await request(app)
        .get('/api/hotels/1')
        .expect(200);

      expect(res.body).toHaveProperty('hotel');
      expect(res.body.hotel).toHaveProperty('id');
      expect(res.body.hotel).toHaveProperty('name');
      expect(res.body.hotel).toHaveProperty('location');
      expect(res.body.hotel).toHaveProperty('price_per_night');
    });

    it('should return 404 for non-existent hotel', async () => {
      const res = await request(app)
        .get('/api/hotels/99999')
        .expect(404);

      expect(res.body.error).toBe('Hotel not found.');
    });
  });
});

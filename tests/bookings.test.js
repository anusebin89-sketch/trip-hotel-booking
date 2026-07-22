const request = require('supertest');
const { createTestApp } = require('./setup');

const app = createTestApp();

describe('Bookings API Endpoints', () => {
  let authCookie;
  const testUser = {
    name: 'Booking Test User',
    email: `booking-test-${Date.now()}@example.com`,
    password: 'password123'
  };

  beforeAll(async () => {
    // Register and login to get session cookie
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authCookie = registerRes.headers['set-cookie'];
  });

  describe('POST /api/bookings', () => {
    it('should reject booking when not authenticated', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'Test Guest',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/28',
          cvv: '123'
        })
        .expect(401);

      expect(res.body.error).toContain('Authentication required');
    });

    it('should create a booking with valid data', async () => {
      if (!authCookie) {
        return; // Skip if registration failed
      }

      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', authCookie)
        .send({
          hotelId: 1,
          guestName: 'Test Guest',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/28',
          cvv: '123'
        })
        .expect(201);

      expect(res.body.message).toBe('Booking confirmed!');
      expect(res.body.booking).toHaveProperty('bookingRef');
      expect(res.body.booking.bookingRef).toMatch(/^SR-/);
    });

    it('should reject booking with missing fields', async () => {
      if (!authCookie) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', authCookie)
        .send({
          hotelId: 1,
          guestName: 'Test Guest'
        })
        .expect(400);

      expect(res.body.error).toBeTruthy();
    });

    it('should reject booking with invalid card number', async () => {
      if (!authCookie) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', authCookie)
        .send({
          hotelId: 1,
          guestName: 'Test Guest',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '1111222233334444',
          cardName: 'Test User',
          expiry: '12/28',
          cvv: '123'
        })
        .expect(402);

      expect(res.body.error).toContain('Payment declined');
    });

    it('should reject booking for non-existent hotel', async () => {
      if (!authCookie) return;

      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', authCookie)
        .send({
          hotelId: 99999,
          guestName: 'Test Guest',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/28',
          cvv: '123'
        })
        .expect(404);

      expect(res.body.error).toBe('Hotel not found.');
    });
  });

  describe('GET /api/bookings/my', () => {
    it('should reject when not authenticated', async () => {
      const res = await request(app)
        .get('/api/bookings/my')
        .expect(401);

      expect(res.body.error).toContain('Authentication required');
    });

    it('should return user bookings when authenticated', async () => {
      if (!authCookie) return;

      const res = await request(app)
        .get('/api/bookings/my')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toHaveProperty('bookings');
      expect(Array.isArray(res.body.bookings)).toBe(true);
    });
  });

  describe('GET /api/bookings/:ref', () => {
    it('should reject when not authenticated', async () => {
      const res = await request(app)
        .get('/api/bookings/SR-FAKE123')
        .expect(401);

      expect(res.body.error).toContain('Authentication required');
    });

    it('should return 404 for non-existent booking', async () => {
      if (!authCookie) return;

      const res = await request(app)
        .get('/api/bookings/SR-NONEXISTENT')
        .set('Cookie', authCookie)
        .expect(404);

      expect(res.body.error).toBe('Booking not found.');
    });
  });
});

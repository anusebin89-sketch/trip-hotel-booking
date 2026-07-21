const request = require('supertest');
const app = require('../server');

describe('Request Validation - Structured Error Responses', () => {

  describe('POST /api/auth/register', () => {
    it('should return 400 with structured error when all fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.statusCode).toBe(400);
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThan(0);
      expect(res.body.details[0]).toHaveProperty('field');
      expect(res.body.details[0]).toHaveProperty('message');
    });

    it('should return 400 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'not-an-email', password: 'secret123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'email')).toBe(true);
    });

    it('should return 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'password')).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'john@test.com', password: 'secret123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'name')).toBe(true);
    });

    it('should accept valid registration data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'validuser_' + Date.now() + '@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 with structured error when fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.statusCode).toBe(400);
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'email')).toBe(true);
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'password')).toBe(true);
    });
  });

  describe('POST /api/bookings', () => {
    let agent;

    beforeAll(async () => {
      agent = request.agent(app);
      // Register and login to get authenticated session
      const email = 'booking_test_' + Date.now() + '@test.com';
      await agent
        .post('/api/auth/register')
        .send({ name: 'Booking Tester', email, password: 'password123' });
    });

    it('should return 400 with structured error when all fields are missing', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.statusCode).toBe(400);
      expect(res.body.details).toBeInstanceOf(Array);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('should return 400 when hotelId is not a number', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 'abc',
          guestName: 'John',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'John Doe',
          expiry: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'hotelId')).toBe(true);
    });

    it('should return 400 when checkOut is before checkIn', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'John',
          checkIn: '2025-12-10',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'John Doe',
          expiry: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'checkOut')).toBe(true);
    });

    it('should return 400 when card number format is invalid', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'John',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: 'abc',
          cardName: 'John Doe',
          expiry: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'cardNumber')).toBe(true);
    });

    it('should return 400 when expiry format is invalid', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'John',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'John Doe',
          expiry: '2025-12',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'expiry')).toBe(true);
    });

    it('should return 400 when CVV is invalid', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'John',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'John Doe',
          expiry: '12/25',
          cvv: '12'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'cvv')).toBe(true);
    });

    it('should return 400 when guests is zero', async () => {
      const res = await agent
        .post('/api/bookings')
        .send({
          hotelId: 1,
          guestName: 'John',
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 0,
          cardNumber: '4242424242424242',
          cardName: 'John Doe',
          expiry: '12/25',
          cvv: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'guests')).toBe(true);
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should return 400 when id is not a valid number', async () => {
      const res = await request(app)
        .get('/api/hotels/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.statusCode).toBe(400);
      expect(res.body.details.some(d => d.field === 'id')).toBe(true);
    });

    it('should return 400 when id is negative', async () => {
      const res = await request(app)
        .get('/api/hotels/-5');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.field === 'id')).toBe(true);
    });

    it('should accept a valid numeric id', async () => {
      const res = await request(app)
        .get('/api/hotels/1');

      // Should not be a 400 validation error - could be 200 or 404 depending on data
      expect(res.status).not.toBe(400);
    });
  });

  describe('GET /api/hotels', () => {
    it('should accept request without query params', async () => {
      const res = await request(app)
        .get('/api/hotels');

      expect(res.status).toBe(200);
      expect(res.body.hotels).toBeInstanceOf(Array);
    });

    it('should accept request with valid location query', async () => {
      const res = await request(app)
        .get('/api/hotels?location=Paris');

      expect(res.status).toBe(200);
      expect(res.body.hotels).toBeInstanceOf(Array);
    });
  });

  describe('Structured Error Response Format', () => {
    it('should always include error, statusCode, and details fields on validation failure', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '', email: '', password: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Validation failed');
      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('details');
      expect(res.body.details).toBeInstanceOf(Array);

      // Each detail should have field and message
      res.body.details.forEach(detail => {
        expect(detail).toHaveProperty('field');
        expect(detail).toHaveProperty('message');
        expect(typeof detail.field).toBe('string');
        expect(typeof detail.message).toBe('string');
      });
    });
  });
});

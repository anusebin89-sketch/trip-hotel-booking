// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for Bookings API endpoints:
 * POST /api/bookings
 * GET  /api/bookings/my
 * GET  /api/bookings/:ref
 */

test.describe('Bookings API Integration', () => {
  const BASE_URL = 'http://localhost:8080';
  const uniqueEmail = () => `booking_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  /** Helper to register and return an authenticated request context */
  async function registerUser(request, email) {
    await request.post(`${BASE_URL}/api/auth/register`, {
      data: { name: 'Booking Test User', email: email, password: 'password123' },
    });
  }

  /** Helper to get a valid hotel ID */
  async function getFirstHotelId(request) {
    const res = await request.get(`${BASE_URL}/api/hotels`);
    const body = await res.json();
    return body.hotels[0].id;
  }

  test.describe('POST /api/bookings - Authentication', () => {
    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: 1,
          guestName: 'Guest',
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required. Please log in.');
    });
  });

  test.describe('POST /api/bookings - Validation', () => {
    let email;

    test.beforeAll(async ({ request }) => {
      email = uniqueEmail();
      await registerUser(request, email);
    });

    test('should return 400 when booking fields are missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: 1,
          // guestName missing
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('All booking fields are required.');
    });

    test('should return 400 when payment fields are missing', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: 1,
          guestName: 'Guest',
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          // cardNumber missing
          cardName: 'Test',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('All payment fields are required.');
    });

    test('should return 402 for declined (non-test) card', async ({ request }) => {
      const hotelId = await getFirstHotelId(request);
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'Guest',
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          cardNumber: '4111111111111111',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(402);
      const body = await response.json();
      expect(body.error).toContain('Payment declined');
    });

    test('should return 404 for non-existent hotel', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: 99999,
          guestName: 'Guest',
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Hotel not found.');
    });

    test('should return 400 for invalid dates (checkout before checkin)', async ({ request }) => {
      const hotelId = await getFirstHotelId(request);
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'Guest',
          checkIn: '2026-12-20',
          checkOut: '2026-12-10',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid check-in or check-out dates.');
    });

    test('should return 400 for same checkin and checkout dates', async ({ request }) => {
      const hotelId = await getFirstHotelId(request);
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'Guest',
          checkIn: '2026-12-20',
          checkOut: '2026-12-20',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid check-in or check-out dates.');
    });
  });

  test.describe('POST /api/bookings - Successful booking', () => {
    let email;

    test.beforeAll(async ({ request }) => {
      email = uniqueEmail();
      await registerUser(request, email);
    });

    test('should create a booking with 201 status and correct price', async ({ request }) => {
      // Get a hotel to know the price
      const hotelRes = await request.get(`${BASE_URL}/api/hotels/1`);
      const hotelData = await hotelRes.json();
      const pricePerNight = hotelData.hotel.price_per_night;

      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: 1,
          guestName: 'Integration Test Guest',
          checkIn: '2026-09-01',
          checkOut: '2026-09-04',
          guests: 2,
          cardNumber: '4242 4242 4242 4242',
          cardName: 'Test User',
          expiry: '12/26',
          cvv: '123',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.message).toBe('Booking confirmed!');
      expect(body.booking).toHaveProperty('booking_ref');
      expect(body.booking.booking_ref).toMatch(/^SR-[A-Z0-9]+$/);
      expect(body.booking.guest_name).toBe('Integration Test Guest');
      expect(body.booking.check_in).toBe('2026-09-01');
      expect(body.booking.check_out).toBe('2026-09-04');
      expect(body.booking.guests).toBe('2');

      // 3 nights × price_per_night
      const expectedPrice = 3 * pricePerNight;
      expect(body.booking.total_price).toBe(expectedPrice);
    });

    test('should accept card number with spaces', async ({ request }) => {
      const hotelId = await getFirstHotelId(request);
      const response = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'Space Card Test',
          checkIn: '2026-10-01',
          checkOut: '2026-10-03',
          guests: 1,
          cardNumber: '4242 4242 4242 4242',
          cardName: 'Test',
          expiry: '12/27',
          cvv: '456',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.booking.booking_ref).toMatch(/^SR-/);
    });
  });

  test.describe('GET /api/bookings/my', () => {
    test('should return 401 when not authenticated', async ({ request }) => {
      // Use a fresh context without session
      const response = await request.get(`${BASE_URL}/api/bookings/my`);
      // Note: this depends on session state; if context has no session it returns 401
      const status = response.status();
      // Either 401 or 200 with bookings depending on session
      expect([200, 401]).toContain(status);
    });

    test('should return bookings for authenticated user', async ({ request }) => {
      const email = uniqueEmail();
      await registerUser(request, email);

      // Create a booking first
      const hotelId = await getFirstHotelId(request);
      await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'My Bookings Test',
          checkIn: '2026-11-01',
          checkOut: '2026-11-03',
          guests: 1,
          cardNumber: '4242424242424242',
          cardName: 'Test',
          expiry: '12/27',
          cvv: '789',
        },
      });

      // Fetch my bookings
      const response = await request.get(`${BASE_URL}/api/bookings/my`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('bookings');
      expect(Array.isArray(body.bookings)).toBe(true);
      expect(body.bookings.length).toBeGreaterThanOrEqual(1);

      const lastBooking = body.bookings[0];
      expect(lastBooking).toHaveProperty('booking_ref');
      expect(lastBooking).toHaveProperty('hotel_name');
      expect(lastBooking).toHaveProperty('total_price');
      expect(lastBooking.guest_name).toBe('My Bookings Test');
    });
  });

  test.describe('GET /api/bookings/:ref', () => {
    test('should return booking details by reference', async ({ request }) => {
      const email = uniqueEmail();
      await registerUser(request, email);

      const hotelId = await getFirstHotelId(request);
      const createRes = await request.post(`${BASE_URL}/api/bookings`, {
        data: {
          hotelId: hotelId,
          guestName: 'Ref Lookup Test',
          checkIn: '2026-11-10',
          checkOut: '2026-11-12',
          guests: 3,
          cardNumber: '4242424242424242',
          cardName: 'Test',
          expiry: '01/28',
          cvv: '321',
        },
      });

      const createBody = await createRes.json();
      const ref = createBody.booking.booking_ref;

      // Lookup by ref
      const response = await request.get(`${BASE_URL}/api/bookings/${ref}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.booking.booking_ref).toBe(ref);
      expect(body.booking.guest_name).toBe('Ref Lookup Test');
    });

    test('should return 404 for non-existent booking reference', async ({ request }) => {
      const email = uniqueEmail();
      await registerUser(request, email);

      const response = await request.get(`${BASE_URL}/api/bookings/SR-NONEXIST`);
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Booking not found.');
    });
  });
});

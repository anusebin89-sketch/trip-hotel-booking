const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';
const TEST_CARD = '4242424242424242';
const unique = () => `buser_${Date.now()}@test.com`;

async function registerAndLogin(request) {
  const email = unique();
  await request.post(`${BASE}/api/auth/register`, {
    data: { name: 'Booking User', email, password: 'pass1234' },
  });
  await request.post(`${BASE}/api/auth/login`, {
    data: { email, password: 'pass1234' },
  });
  return email;
}

async function getFirstHotelId(request) {
  const res = await request.get(`${BASE}/api/hotels`);
  return (await res.json()).hotels[0].id;
}

function validBooking(hotelId) {
  return {
    hotelId,
    guestName: 'Jane Doe',
    checkIn: '2027-03-01',
    checkOut: '2027-03-05',
    guests: 2,
    cardNumber: TEST_CARD,
    cardName: 'Jane Doe',
    expiry: '12/27',
    cvv: '123',
  };
}

test.describe('EPMCDMETST-55146 | Booking creation and conflict detection', () => {

  test('create a booking when authenticated (201)', async ({ request }) => {
    await registerAndLogin(request);
    const hotelId = await getFirstHotelId(request);
    const res = await request.post(`${BASE}/api/bookings`, {
      data: validBooking(hotelId),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.booking).toHaveProperty('booking_ref');
  });

  test('reject booking when not authenticated (401)', async ({ request }) => {
    const hotelId = await getFirstHotelId(request);
    const res = await request.post(`${BASE}/api/bookings`, {
      data: validBooking(hotelId),
    });
    expect(res.status()).toBe(401);
  });

  test('reject booking with declined card (402)', async ({ request }) => {
    await registerAndLogin(request);
    const hotelId = await getFirstHotelId(request);
    const res = await request.post(`${BASE}/api/bookings`, {
      data: { ...validBooking(hotelId), cardNumber: '1111111111111111' },
    });
    expect(res.status()).toBe(402);
  });

  test('reject booking with invalid dates (400)', async ({ request }) => {
    await registerAndLogin(request);
    const hotelId = await getFirstHotelId(request);
    const res = await request.post(`${BASE}/api/bookings`, {
      data: { ...validBooking(hotelId), checkIn: '2027-03-10', checkOut: '2027-03-05' },
    });
    expect(res.status()).toBe(400);
  });

  test('reject booking with missing fields (400)', async ({ request }) => {
    await registerAndLogin(request);
    const res = await request.post(`${BASE}/api/bookings`, {
      data: { guestName: 'Jane' },
    });
    expect(res.status()).toBe(400);
  });

});

test.describe('EPMCDMETST-55146 | My bookings', () => {

  test('GET /api/bookings/my returns user bookings', async ({ request }) => {
    await registerAndLogin(request);
    const hotelId = await getFirstHotelId(request);
    await request.post(`${BASE}/api/bookings`, { data: validBooking(hotelId) });
    const res = await request.get(`${BASE}/api/bookings/my`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.bookings)).toBeTruthy();
  });

  test('GET /api/bookings/my returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/bookings/my`);
    expect(res.status()).toBe(401);
  });

});

test.describe('EPMCDMETST-55140 | Error handling middleware', () => {

  test('returns X-Request-Id header on every response', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels`);
    expect(res.headers()['x-request-id']).toBeTruthy();
  });

  test('returns structured JSON error on 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels/999999`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

});

test.describe('EPMCDMETST-55147 | Security headers (Helmet)', () => {

  test('response includes X-Content-Type-Options header', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels`);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('response includes X-Frame-Options header', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels`);
    expect(res.headers()['x-frame-options']).toBeTruthy();
  });

  test('response includes Content-Security-Policy header', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels`);
    expect(res.headers()['content-security-policy']).toBeTruthy();
  });

});

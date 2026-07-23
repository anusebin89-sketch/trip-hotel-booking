const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:8080';

test.describe('EPMCDMETST-55142/55145 | Hotel listing and filtering', () => {

  test('GET /api/hotels returns a list of hotels', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.hotels)).toBeTruthy();
    expect(body.hotels.length).toBeGreaterThan(0);
  });

  test('GET /api/hotels?location= filters results', async ({ request }) => {
    const allRes = await request.get(`${BASE}/api/hotels`);
    const allHotels = (await allRes.json()).hotels;
    const location = allHotels[0].location;

    const res = await request.get(`${BASE}/api/hotels?location=${encodeURIComponent(location)}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hotels.every(h => h.location.toLowerCase() === location.toLowerCase())).toBeTruthy();
  });

  test('GET /api/hotels/:id returns a single hotel', async ({ request }) => {
    const allRes = await request.get(`${BASE}/api/hotels`);
    const id = (await allRes.json()).hotels[0].id;
    const res = await request.get(`${BASE}/api/hotels/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hotel).toHaveProperty('id', id);
  });

  test('GET /api/hotels/:id returns 404 for unknown id', async ({ request }) => {
    const res = await request.get(`${BASE}/api/hotels/999999`);
    expect(res.status()).toBe(404);
  });

});

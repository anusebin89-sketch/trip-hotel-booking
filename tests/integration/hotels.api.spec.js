// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for Hotels API endpoints:
 * GET /api/hotels
 * GET /api/hotels?location=X
 * GET /api/hotels/:id
 */

test.describe('Hotels API Integration', () => {
  const BASE_URL = 'http://localhost:8080';

  test.describe('GET /api/hotels', () => {
    test('should return all hotels with 200 status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('hotels');
      expect(Array.isArray(body.hotels)).toBe(true);
      expect(body.hotels.length).toBe(10);
    });

    test('each hotel should have required properties', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`);
      const body = await response.json();

      for (const hotel of body.hotels) {
        expect(hotel).toHaveProperty('id');
        expect(hotel).toHaveProperty('name');
        expect(hotel).toHaveProperty('location');
        expect(hotel).toHaveProperty('price_per_night');
        expect(hotel).toHaveProperty('rating');
        expect(typeof hotel.id).toBe('number');
        expect(typeof hotel.name).toBe('string');
        expect(typeof hotel.location).toBe('string');
        expect(typeof hotel.price_per_night).toBe('number');
        expect(typeof hotel.rating).toBe('number');
      }
    });
  });

  test.describe('GET /api/hotels?location=X', () => {
    test('should filter hotels by location (Paris)', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`, {
        params: { location: 'Paris' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.hotels.length).toBeGreaterThan(0);
      for (const hotel of body.hotels) {
        expect(hotel.location.toLowerCase()).toContain('paris');
      }
    });

    test('should filter hotels by location (Tokyo)', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`, {
        params: { location: 'Tokyo' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.hotels.length).toBeGreaterThan(0);
      for (const hotel of body.hotels) {
        expect(hotel.location.toLowerCase()).toContain('tokyo');
      }
    });

    test('should filter hotels by location case-insensitively', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`, {
        params: { location: 'pARiS' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.hotels.length).toBeGreaterThan(0);
      for (const hotel of body.hotels) {
        expect(hotel.location.toLowerCase()).toContain('paris');
      }
    });

    test('should return empty array for non-existent location', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels`, {
        params: { location: 'Atlantis' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.hotels).toEqual([]);
    });
  });

  test.describe('GET /api/hotels/:id', () => {
    test('should return a single hotel by id', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels/1`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('hotel');
      expect(body.hotel.id).toBe(1);
      expect(body.hotel).toHaveProperty('name');
      expect(body.hotel).toHaveProperty('location');
      expect(body.hotel).toHaveProperty('price_per_night');
      expect(body.hotel).toHaveProperty('rating');
    });

    test('should return 404 for non-existent hotel id', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels/9999`);

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Hotel not found.');
    });

    test('should return correct hotel data for id 2', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/hotels/2`);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.hotel.id).toBe(2);
      expect(body.hotel.name).toBeDefined();
      expect(body.hotel.price_per_night).toBeGreaterThan(0);
    });
  });
});

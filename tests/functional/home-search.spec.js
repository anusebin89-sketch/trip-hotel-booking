// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Functional (E2E UI) tests for the StayRed Home Page and Hotel Search.
 */

test.describe('Home Page and Hotel Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('landing page displays hero section with heading', async ({ page }) => {
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toContainText('Find Your Perfect Stay');
  });

  test('landing page displays destination dropdown with 5 options', async ({ page }) => {
    const select = page.locator('#destination');
    await expect(select).toBeVisible();

    // 5 destinations + 1 placeholder = 6 options
    const options = select.locator('option');
    const count = await options.count();
    expect(count).toBe(6); // placeholder + 5 destinations
  });

  test('landing page displays 5 popular destination cards', async ({ page }) => {
    const destinationCards = page.locator('.dest-card');
    await expect(destinationCards).toHaveCount(5);
  });

  test('search without selecting destination shows error toast', async ({ page }) => {
    const searchBtn = page.locator('.btn-search');
    await searchBtn.click();

    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Please select a destination');
  });

  test('search for hotels in Paris displays results', async ({ page }) => {
    // Select Paris
    await page.selectOption('#destination', 'Paris');

    // Click search
    await page.locator('.btn-search').click();

    // Wait for results section to appear
    const resultsSection = page.locator('#results-section');
    await expect(resultsSection).toBeVisible();

    // Check results title
    const resultsTitle = page.locator('#results-title');
    await expect(resultsTitle).toContainText('Hotels in Paris');

    // Check hotel cards are displayed
    const hotelCards = page.locator('.hotel-card');
    const cardCount = await hotelCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('hotel card shows name, location, price, and Book Now button', async ({ page }) => {
    await page.selectOption('#destination', 'Paris');
    await page.locator('.btn-search').click();

    // Wait for hotels to load
    await page.waitForSelector('.hotel-card');

    const firstCard = page.locator('.hotel-card').first();
    await expect(firstCard.locator('.hotel-name')).toBeVisible();
    await expect(firstCard.locator('.hotel-location')).toBeVisible();
    await expect(firstCard.locator('.price-amount')).toBeVisible();
    await expect(firstCard.locator('.btn-book')).toBeVisible();
    await expect(firstCard.locator('.btn-book')).toContainText('Book Now');
  });

  test('quick search via destination card shows hotels', async ({ page }) => {
    // Click on the Tokyo destination card
    const tokyoCard = page.locator('.dest-card', { hasText: 'Tokyo' });
    await tokyoCard.click();

    // Wait for results
    await page.waitForSelector('.hotel-card');

    const resultsTitle = page.locator('#results-title');
    await expect(resultsTitle).toContainText('Hotels in Tokyo');

    const hotelCards = page.locator('.hotel-card');
    const count = await hotelCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('results count displays correct number', async ({ page }) => {
    await page.selectOption('#destination', 'New York');
    await page.locator('.btn-search').click();
    await page.waitForSelector('.hotel-card');

    const countEl = page.locator('#results-count');
    await expect(countEl).toBeVisible();
    // Should contain "X hotel(s) found"
    const text = await countEl.textContent();
    expect(text).toMatch(/\d+ hotels? found/);
  });
});

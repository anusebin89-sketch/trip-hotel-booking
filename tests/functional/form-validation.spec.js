// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Functional (E2E UI) tests for frontend form validation feedback.
 * Tests the booking modal validation and payment form validation.
 */

test.describe('Form Validation UI', () => {
  const uniqueEmail = () => `formval_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  async function registerAndLogin(page) {
    const email = uniqueEmail();
    await page.request.post('/api/auth/register', {
      data: { name: 'Form Val User', email: email, password: 'password123' },
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  }

  async function openBookingModal(page) {
    await page.selectOption('#destination', 'Paris');
    await page.locator('.btn-search').click();
    await page.waitForSelector('.hotel-card');
    await page.locator('.btn-book').first().click();
    await expect(page.locator('#booking-modal')).toBeVisible();
  }

  test.describe('Booking Step Validation', () => {
    test('shows error when guest name is empty', async ({ page }) => {
      await registerAndLogin(page);
      await openBookingModal(page);

      // Clear guest name (it may be pre-filled)
      await page.fill('#book-guest-name', '');
      await page.fill('#book-checkin', '2026-09-01');
      await page.fill('#book-checkout', '2026-09-04');

      // Try to continue
      await page.locator('button', { hasText: 'Continue to Payment' }).click();

      const error = page.locator('#booking-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Please enter the guest name');
    });

    test('shows error when check-in date is empty', async ({ page }) => {
      await registerAndLogin(page);
      await openBookingModal(page);

      // Fill guest name but clear check-in
      await page.fill('#book-guest-name', 'Test Guest');
      await page.fill('#book-checkin', '');
      await page.fill('#book-checkout', '2026-09-04');

      await page.locator('button', { hasText: 'Continue to Payment' }).click();

      const error = page.locator('#booking-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Please select a check-in date');
    });

    test('shows error when check-out date is empty', async ({ page }) => {
      await registerAndLogin(page);
      await openBookingModal(page);

      await page.fill('#book-guest-name', 'Test Guest');
      await page.fill('#book-checkin', '2026-09-01');
      await page.fill('#book-checkout', '');

      await page.locator('button', { hasText: 'Continue to Payment' }).click();

      const error = page.locator('#booking-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Please select a check-out date');
    });

    test('shows error when check-out is before check-in', async ({ page }) => {
      await registerAndLogin(page);
      await openBookingModal(page);

      await page.fill('#book-guest-name', 'Test Guest');
      await page.fill('#book-checkin', '2026-09-10');
      await page.fill('#book-checkout', '2026-09-05');

      await page.locator('button', { hasText: 'Continue to Payment' }).click();

      const error = page.locator('#booking-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Check-out date must be after check-in date');
    });
  });

  test.describe('Payment Step Validation', () => {
    async function goToPaymentStep(page) {
      await registerAndLogin(page);
      await openBookingModal(page);

      await page.fill('#book-guest-name', 'Payment Val Guest');
      await page.fill('#book-checkin', '2026-09-01');
      await page.fill('#book-checkout', '2026-09-04');
      await page.selectOption('#book-guests', '2');

      await page.locator('button', { hasText: 'Continue to Payment' }).click();
      await expect(page.locator('#step-payment')).toBeVisible();
    }

    test('shows error when all payment fields are empty', async ({ page }) => {
      await goToPaymentStep(page);

      // Leave all fields empty and click Pay
      await page.locator('#pay-btn').click();

      const error = page.locator('#payment-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Please fill in all payment details');
    });

    test('shows error when cardholder name is empty', async ({ page }) => {
      await goToPaymentStep(page);

      // Fill everything except name
      await page.fill('#pay-card', '4242 4242 4242 4242');
      await page.fill('#pay-expiry', '12/26');
      await page.fill('#pay-cvv', '123');

      await page.locator('#pay-btn').click();

      const error = page.locator('#payment-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Please fill in all payment details');
    });

    test('shows error for invalid expiry format', async ({ page }) => {
      await goToPaymentStep(page);

      await page.fill('#pay-name', 'Test User');
      await page.fill('#pay-card', '4242 4242 4242 4242');
      await page.fill('#pay-expiry', '1226'); // missing slash
      await page.fill('#pay-cvv', '123');

      await page.locator('#pay-btn').click();

      const error = page.locator('#payment-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('valid expiry date');
    });

    test('shows error for short CVV', async ({ page }) => {
      await goToPaymentStep(page);

      await page.fill('#pay-name', 'Test User');
      await page.fill('#pay-card', '4242 4242 4242 4242');
      await page.fill('#pay-expiry', '12/26');
      await page.fill('#pay-cvv', '12'); // too short

      await page.locator('#pay-btn').click();

      const error = page.locator('#payment-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('valid CVV');
    });
  });
});

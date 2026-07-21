// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Functional (E2E UI) tests for the complete booking journey:
 * Search → Book → Pay → Confirmation
 * Also covers: declined card, unauthenticated booking attempt, booking history.
 */

test.describe('End-to-End Booking Flow', () => {
  const uniqueEmail = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  /**
   * Helper: Register a user and ensure session is established
   */
  async function registerAndLogin(page) {
    const email = uniqueEmail();
    await page.request.post('/api/auth/register', {
      data: { name: 'E2E Test User', email: email, password: 'password123' },
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    return email;
  }

  /**
   * Helper: Navigate to hotel search results for a given destination
   */
  async function searchHotels(page, destination) {
    await page.selectOption('#destination', destination);
    await page.locator('.btn-search').click();
    await page.waitForSelector('.hotel-card');
  }

  test.describe('Successful Booking', () => {
    test('logged-in user completes full booking with test card', async ({ page }) => {
      await registerAndLogin(page);

      // Search for Paris hotels
      await searchHotels(page, 'Paris');

      // Click Book Now on first hotel
      const firstBookBtn = page.locator('.btn-book').first();
      await firstBookBtn.click();

      // Booking modal should open
      const modal = page.locator('#booking-modal');
      await expect(modal).toBeVisible();

      // Verify hotel name is shown in modal header
      const modalHotelName = page.locator('#modal-hotel-name');
      await expect(modalHotelName).not.toBeEmpty();

      // Fill booking details
      await page.fill('#book-guest-name', 'E2E Test Guest');
      await page.fill('#book-checkin', '2026-09-01');
      await page.fill('#book-checkout', '2026-09-04');
      await page.selectOption('#book-guests', '2');

      // Continue to payment
      await page.locator('button', { hasText: 'Continue to Payment' }).click();

      // Payment step should be visible
      const paymentStep = page.locator('#step-payment');
      await expect(paymentStep).toBeVisible();

      // Price summary should show
      const payTotal = page.locator('#pay-total');
      await expect(payTotal).not.toBeEmpty();
      const totalText = await payTotal.textContent();
      expect(totalText).toContain('$');

      // Fill payment details with test card
      await page.fill('#pay-name', 'E2E Test User');
      await page.fill('#pay-card', '4242 4242 4242 4242');
      await page.fill('#pay-expiry', '12/26');
      await page.fill('#pay-cvv', '123');

      // Click Pay Now
      await page.locator('#pay-btn').click();

      // Wait for confirmation page to appear
      await page.waitForSelector('#page-confirmation.active', { timeout: 10000 });

      // Verify confirmation page content
      const confirmationHeading = page.locator('.confirmation-card h2');
      await expect(confirmationHeading).toContainText('Booking Confirmed');

      // Booking reference should match SR- pattern
      const refEl = page.locator('.receipt-ref');
      await expect(refEl).toBeVisible();
      const refText = await refEl.textContent();
      expect(refText).toMatch(/SR-[A-Z0-9]+/);

      // Receipt should show hotel details
      const receiptDetails = page.locator('#receipt-details');
      await expect(receiptDetails).toContainText('E2E Test Guest');
    });

    test('booking calculates correct price for multiple nights', async ({ page }) => {
      await registerAndLogin(page);
      await searchHotels(page, 'Tokyo');

      // Get the price displayed on the card
      const priceText = await page.locator('.hotel-card').first().locator('.price-amount').textContent();
      const pricePerNight = parseInt(priceText.replace('$', ''));

      // Click Book Now
      await page.locator('.btn-book').first().click();
      await expect(page.locator('#booking-modal')).toBeVisible();

      // Fill dates for 3 nights
      await page.fill('#book-guest-name', 'Price Check Guest');
      await page.fill('#book-checkin', '2026-10-01');
      await page.fill('#book-checkout', '2026-10-04');

      // Check price summary
      const priceSummary = page.locator('#price-summary');
      await expect(priceSummary).toBeVisible();

      const nightsLabel = page.locator('#price-nights-label');
      await expect(nightsLabel).toContainText('3 night');

      const grandTotal = page.locator('#price-grand-total');
      const totalText = await grandTotal.textContent();
      const expectedTotal = pricePerNight * 3;
      expect(totalText).toContain(`$${expectedTotal}`);
    });
  });

  test.describe('Payment Declined', () => {
    test('booking with declined card shows payment error', async ({ page }) => {
      await registerAndLogin(page);
      await searchHotels(page, 'Paris');

      // Book first hotel
      await page.locator('.btn-book').first().click();
      await expect(page.locator('#booking-modal')).toBeVisible();

      // Fill booking details
      await page.fill('#book-guest-name', 'Declined Card Guest');
      await page.fill('#book-checkin', '2026-09-01');
      await page.fill('#book-checkout', '2026-09-03');
      await page.selectOption('#book-guests', '1');

      // Continue to payment
      await page.locator('button', { hasText: 'Continue to Payment' }).click();
      await expect(page.locator('#step-payment')).toBeVisible();

      // Fill with a card that will be declined
      await page.fill('#pay-name', 'Declined User');
      await page.fill('#pay-card', '4111 1111 1111 1111');
      await page.fill('#pay-expiry', '12/26');
      await page.fill('#pay-cvv', '456');

      // Click Pay Now
      await page.locator('#pay-btn').click();

      // Wait for error to appear
      const paymentError = page.locator('#payment-error');
      await expect(paymentError).toBeVisible({ timeout: 5000 });
      await expect(paymentError).toContainText('Payment declined');

      // Confirmation page should NOT be visible
      const confirmationPage = page.locator('#page-confirmation.active');
      await expect(confirmationPage).not.toBeVisible();
    });
  });

  test.describe('Unauthenticated User', () => {
    test('clicking Book Now when not logged in shows login page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Make sure we're NOT logged in
      await page.request.post('/api/auth/logout');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Search hotels
      await searchHotels(page, 'London');

      // Click Book Now
      await page.locator('.btn-book').first().click();

      // Should navigate to auth page
      await page.waitForSelector('#page-auth.active');

      // Toast should show login prompt
      const toast = page.locator('#toast');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Please log in to make a booking');
    });
  });

  test.describe('Booking History', () => {
    test('user can view booking history after completing a booking', async ({ page }) => {
      await registerAndLogin(page);

      // Create a booking via API for speed
      await page.request.post('/api/bookings', {
        data: {
          hotelId: 1,
          guestName: 'History Test Guest',
          checkIn: '2026-11-01',
          checkOut: '2026-11-03',
          guests: 2,
          cardNumber: '4242424242424242',
          cardName: 'Test',
          expiry: '12/26',
          cvv: '123',
        },
      });

      // Navigate to My Bookings via nav link
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click My Bookings in navigation
      const myBookingsLink = page.locator('.nav-link', { hasText: 'My Bookings' });
      await myBookingsLink.click();

      // Should show bookings page
      await page.waitForSelector('#page-bookings.active');

      // Should contain the booking item
      const bookingItems = page.locator('.booking-item');
      const count = await bookingItems.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify booking details are shown
      const firstBooking = bookingItems.first();
      await expect(firstBooking.locator('h3')).toBeVisible(); // hotel name
      await expect(firstBooking.locator('.booking-ref')).toBeVisible(); // booking ref
    });

    test('My Bookings redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ensure logged out
      await page.request.post('/api/auth/logout');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Try to navigate to My Bookings
      const myBookingsLink = page.locator('.nav-link', { hasText: 'My Bookings' });
      await myBookingsLink.click();

      // Should show auth page
      await page.waitForSelector('#page-auth.active');

      // Toast error
      const toast = page.locator('#toast');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Please log in');
    });
  });
});

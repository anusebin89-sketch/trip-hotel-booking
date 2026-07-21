// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Functional (E2E UI) tests for User Registration, Login, and Logout.
 */

test.describe('User Authentication UI', () => {
  const uniqueEmail = () => `uitest_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Registration', () => {
    test('user can register a new account', async ({ page }) => {
      const email = uniqueEmail();

      // Navigate to auth page
      await page.locator('#nav-auth-btn').click();
      await page.waitForSelector('#page-auth.active');

      // Switch to register tab
      await page.locator('#tab-register').click();
      await expect(page.locator('#form-register')).toBeVisible();

      // Fill registration form
      await page.fill('#reg-name', 'John Doe');
      await page.fill('#reg-email', email);
      await page.fill('#reg-password', 'secret123');

      // Submit
      await page.locator('#form-register button[type="submit"]').click();

      // Should navigate to home page
      await page.waitForSelector('#page-home.active');

      // Navigation should show user name and Logout button
      const navUsername = page.locator('#nav-username');
      await expect(navUsername).toBeVisible();
      await expect(navUsername).toContainText('Hi, John');

      const navBtn = page.locator('#nav-auth-btn');
      await expect(navBtn).toContainText('Logout');

      // Success toast
      const toast = page.locator('#toast');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Account created');
    });

    test('registration shows error for duplicate email', async ({ page }) => {
      const email = uniqueEmail();

      // Register first time via API
      await page.request.post('/api/auth/register', {
        data: { name: 'Existing', email: email, password: 'password123' },
      });

      // Clear session
      await page.request.post('/api/auth/logout');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Navigate to register
      await page.locator('#nav-auth-btn').click();
      await page.waitForSelector('#page-auth.active');
      await page.locator('#tab-register').click();

      // Fill with duplicate email
      await page.fill('#reg-name', 'Another User');
      await page.fill('#reg-email', email);
      await page.fill('#reg-password', 'password456');
      await page.locator('#form-register button[type="submit"]').click();

      // Error should display
      const error = page.locator('#register-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('An account with this email already exists.');
    });
  });

  test.describe('Login', () => {
    let testEmail;

    test.beforeAll(async ({ request }) => {
      testEmail = uniqueEmail();
      await request.post('/api/auth/register', {
        data: { name: 'Login UI Test', email: testEmail, password: 'secret123' },
      });
      await request.post('/api/auth/logout');
    });

    test('user can log in with valid credentials', async ({ page }) => {
      // Navigate to login page
      await page.locator('#nav-auth-btn').click();
      await page.waitForSelector('#page-auth.active');

      // Fill login form
      await page.fill('#login-email', testEmail);
      await page.fill('#login-password', 'secret123');
      await page.locator('#form-login button[type="submit"]').click();

      // Should navigate to home
      await page.waitForSelector('#page-home.active');

      // Navigation updates
      const navUsername = page.locator('#nav-username');
      await expect(navUsername).toBeVisible();
      await expect(navUsername).toContainText('Hi, Login');

      const navBtn = page.locator('#nav-auth-btn');
      await expect(navBtn).toContainText('Logout');

      // Welcome toast
      const toast = page.locator('#toast');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Welcome back');
    });

    test('login shows error for invalid credentials', async ({ page }) => {
      await page.locator('#nav-auth-btn').click();
      await page.waitForSelector('#page-auth.active');

      await page.fill('#login-email', 'nonexistent@test.com');
      await page.fill('#login-password', 'wrongpass');
      await page.locator('#form-login button[type="submit"]').click();

      const error = page.locator('#login-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Invalid email or password.');
    });

    test('login shows error for wrong password', async ({ page }) => {
      await page.locator('#nav-auth-btn').click();
      await page.waitForSelector('#page-auth.active');

      await page.fill('#login-email', testEmail);
      await page.fill('#login-password', 'incorrectpassword');
      await page.locator('#form-login button[type="submit"]').click();

      const error = page.locator('#login-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Invalid email or password.');
    });
  });

  test.describe('Logout', () => {
    test('user can log out', async ({ page }) => {
      const email = uniqueEmail();

      // Register and stay logged in
      await page.request.post('/api/auth/register', {
        data: { name: 'Logout Test', email: email, password: 'password123' },
      });

      // Reload to pick up session
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should be logged in
      await expect(page.locator('#nav-auth-btn')).toContainText('Logout');

      // Click logout
      await page.locator('#nav-auth-btn').click();

      // Should show Login button
      await expect(page.locator('#nav-auth-btn')).toContainText('Login');

      // Username hidden
      const navUsername = page.locator('#nav-username');
      await expect(navUsername).toBeHidden();

      // Toast
      const toast = page.locator('#toast');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('You have been logged out');
    });
  });
});

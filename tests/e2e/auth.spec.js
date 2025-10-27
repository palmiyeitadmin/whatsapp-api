import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should show login section
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#dashboard-section')).toBeHidden();
    
    // Should have Google sign-in button
    await expect(page.locator('#google-signin-btn')).toBeVisible();
    await expect(page.locator('#google-signin-btn')).toContainText('Sign in with Google');
  });

  test('should redirect to Google OAuth when clicking sign-in', async ({ page }) => {
    await page.goto('/');
    
    // Mock the OAuth redirect
    const oauthPromise = page.waitForEvent('request');
    await page.locator('#google-signin-btn').click();
    
    // Should redirect to Google OAuth
    const request = await oauthPromise;
    expect(request.url()).toContain('accounts.google.com');
    expect(request.url()).toContain('oauth2');
  });

  test('should show dashboard when authenticated', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('mockAuth', 'true');
    });
    
    // Mock auth status endpoint
    await page.route('/api/auth/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            google_id: 'test-id',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    });

    await page.goto('/');
    
    // Should show dashboard
    await expect(page.locator('#dashboard-section')).toBeVisible();
    await expect(page.locator('#login-section')).toBeHidden();
    
    // Should show user info in header
    await expect(page.locator('#auth-container')).toContainText('Welcome, Test User');
    await expect(page.locator('#logout-btn')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('mockAuth', 'true');
    });
    
    // Mock auth endpoints
    await page.route('/api/auth/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: { google_id: 'test-id', email: 'test@example.com' }
        })
      });
    });

    await page.route('/functions/auth/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/');
    
    // Click logout
    await page.locator('#logout-btn').click();
    
    // Should return to login
    await expect(page.locator('#login-section')).toBeVisible();
    await expect(page.locator('#dashboard-section')).toBeHidden();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Messaging Flow', () => {
  test.beforeEach(async ({ page }) => {
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
          user: {
            google_id: 'test-id',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    });
  });

  test('should load contacts list', async ({ page }) => {
    // Mock contacts API
    await page.route('/api/contacts/list*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              name: 'John Doe',
              phone_number: '+1234567890',
              email: 'john@example.com'
            },
            {
              id: 2,
              name: 'Jane Smith',
              phone_number: '+0987654321',
              email: 'jane@example.com'
            }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        })
      });
    });

    await page.goto('/');
    
    // Wait for contacts to load
    await expect(page.locator('#contacts-list')).toBeVisible();
    await expect(page.locator('.contact-checkbox')).toHaveCount(2);
    
    // Check contact details are displayed
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=+1234567890')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=+0987654321')).toBeVisible();
  });

  test('should select contacts and compose message', async ({ page }) => {
    // Mock APIs
    await page.route('/api/contacts/list*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, name: 'John Doe', phone_number: '+1234567890' },
            { id: 2, name: 'Jane Smith', phone_number: '+0987654321' }
          ]
        })
      });
    });

    await page.route('/api/message/send', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [
            { contactId: 1, status: 'sent', messageId: 'msg-1' },
            { contactId: 2, status: 'sent', messageId: 'msg-2' }
          ],
          summary: { total: 2, sent: 2, failed: 0 }
        })
      });
    });

    await page.goto('/');
    
    // Select first contact
    await page.locator('#contact-1').check();
    await expect(page.locator('#selected-count')).toContainText('1');
    
    // Select second contact
    await page.locator('#contact-2').check();
    await expect(page.locator('#selected-count')).toContainText('2');
    
    // Compose message
    await page.locator('#message-content').fill('Hello from test!');
    
    // Check character count
    await expect(page.locator('#message-count')).toContainText('16 / 4096 characters');
    
    // Check preview
    await expect(page.locator('#message-preview')).toContainText('Hello from test!');
    
    // Send button should be enabled
    await expect(page.locator('#send-message-btn-main')).toBeEnabled();
  });

  test('should send message successfully', async ({ page }) => {
    // Mock APIs
    await page.route('/api/contacts/list*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, name: 'John Doe', phone_number: '+1234567890' }]
        })
      });
    });

    await page.route('/api/message/send', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [{ contactId: 1, status: 'sent', messageId: 'msg-123' }],
          summary: { total: 1, sent: 1, failed: 0 }
        })
      });
    });

    await page.goto('/');
    
    // Select contact and compose message
    await page.locator('#contact-1').check();
    await page.locator('#message-content').fill('Test message');
    
    // Send message
    await page.locator('#send-message-btn-main').click();
    
    // Should show success notification
    await expect(page.locator('.notification.success')).toBeVisible();
    await expect(page.locator('.notification.success')).toContainText('Messages sent: 1/1');
    
    // Should clear form
    await expect(page.locator('#message-content')).toBeEmpty();
    await expect(page.locator('#selected-count')).toContainText('0');
  });

  test('should handle message validation', async ({ page }) => {
    await page.route('/api/contacts/list*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, name: 'John Doe', phone_number: '+1234567890' }]
        })
      });
    });

    await page.goto('/');
    
    // Send button should be disabled without message
    await expect(page.locator('#send-message-btn-main')).toBeDisabled();
    
    // Select contact
    await page.locator('#contact-1').check();
    
    // Still disabled without message
    await expect(page.locator('#send-message-btn-main')).toBeDisabled();
    
    // Enable with message
    await page.locator('#message-content').fill('Test');
    await expect(page.locator('#send-message-btn-main')).toBeEnabled();
    
    // Test message length validation
    const longMessage = 'a'.repeat(4097);
    await page.locator('#message-content').fill(longMessage);
    await expect(page.locator('#message-count')).toHaveClass(/text-red-500/);
    await expect(page.locator('#send-message-btn-main')).toBeDisabled();
  });

  test('should search contacts', async ({ page }) => {
    await page.route('/api/contacts/list*', async route => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get('search');
      
      let contacts = [
        { id: 1, name: 'John Doe', phone_number: '+1234567890' },
        { id: 2, name: 'Jane Smith', phone_number: '+0987654321' }
      ];
      
      if (search === 'John') {
        contacts = [contacts[0]];
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: contacts,
          pagination: { page: 1, limit: 20, total: contacts.length }
        })
      });
    });

    await page.goto('/');
    
    // Search for John
    await page.locator('#contacts-search').fill('John');
    
    // Should show only John
    await expect(page.locator('.contact-checkbox')).toHaveCount(1);
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeHidden();
    
    // Clear search
    await page.locator('#contacts-search').fill('');
    
    // Should show both contacts
    await expect(page.locator('.contact-checkbox')).toHaveCount(2);
  });
});
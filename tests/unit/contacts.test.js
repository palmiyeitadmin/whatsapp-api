import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Contacts API', () => {
  let mockContext, mockEnv, mockUser;

  beforeEach(() => {
    mockUser = {
      google_id: 'test-google-id',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockEnv = {
      CF_INFOBIP_DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        batch: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockResolvedValue(undefined),
        all: vi.fn(),
        first: vi.fn()
      }
    };

    mockContext = {
      env: mockEnv,
      user: mockUser,
      request: {
        json: vi.fn(),
        headers: {
          get: vi.fn()
        }
      }
    };
  });

  describe('Contacts List', () => {
    it('should return paginated contacts list', async () => {
      const mockContacts = [
        { id: 1, name: 'John Doe', phone_number: '+1234567890' },
        { id: 2, name: 'Jane Smith', phone_number: '+0987654321' }
      ];

      mockContext.request.url = 'http://localhost/api/contacts/list?page=1&limit=20';
      
      mockEnv.CF_INFOBIP_DB.all
        .mockResolvedValueOnce({ results: [{ total: 2 }] })
        .mockResolvedValueOnce({ results: mockContacts });

      // Mock the contacts list module
      const { onRequestGet } = await import('../../functions/api/contacts/list.js');
      const response = await onRequestGet(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockContacts);
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(20);
    });

    it('should filter contacts by search term', async () => {
      mockContext.request.url = 'http://localhost/api/contacts/list?search=John';
      
      mockEnv.CF_INFOBIP_DB.all
        .mockResolvedValueOnce({ results: [{ total: 1 }] })
        .mockResolvedValueOnce({ results: [{ id: 1, name: 'John Doe' }] });

      const { onRequestGet } = await import('../../functions/api/contacts/list.js');
      const response = await onRequestGet(mockContext);
      const data = await response.json();

      expect(mockEnv.CF_INFOBIP_DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ?)')
      );
      expect(data.filters.search).toBe('John');
    });

    it('should handle invalid pagination parameters', async () => {
      mockContext.request.url = 'http://localhost/api/contacts/list?page=0&limit=200';
      
      mockEnv.CF_INFOBIP_DB.all
        .mockResolvedValueOnce({ results: [{ total: 0 }] })
        .mockResolvedValueOnce({ results: [] });

      const { onRequestGet } = await import('../../functions/api/contacts/list.js');
      const response = await onRequestGet(mockContext);
      const data = await response.json();

      expect(data.pagination.page).toBe(1); // Corrected to minimum 1
      expect(data.pagination.limit).toBe(100); // Limited to maximum 100
    });
  });

  describe('Contacts Import', () => {
    it('should import contacts from Google API', async () => {
      const mockImportResult = {
        imported: 10,
        updated: 5,
        total: 15
      };

      mockContext.request.json.mockResolvedValue({});
      
      // Mock the import function
      const { onRequestPost } = await import('../../functions/api/contacts/import.js');
      
      // Mock fetch for Google OAuth token refresh
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'new-access-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            connections: [
              { resourceName: 'people/1', names: [{ displayName: 'Test User' }] }
            ]
          })
        });

      mockEnv.CF_INFOBIP_DB.prepare.mockReturnThis();
      mockEnv.CF_INFOBIP_DB.run.mockResolvedValue({});

      const response = await onRequestPost(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle missing refresh token', async () => {
      mockContext.user = { ...mockUser, google_refresh_token: null };
      mockContext.request.json.mockResolvedValue({});

      const { onRequestPost } = await import('../../functions/api/contacts/import.js');
      const response = await onRequestPost(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No refresh token available');
    });
  });
});

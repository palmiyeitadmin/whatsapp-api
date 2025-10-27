import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withAuth, createProtectedRoute } from '../functions/middleware/auth.js';

describe('Authentication Middleware', () => {
  let mockRequest, mockEnv, mockUser;

  beforeEach(() => {
    mockUser = {
      google_id: 'test-google-id',
      email: 'test@example.com',
      name: 'Test User'
    };

    mockEnv = {
      JWT_SECRET: 'test-secret',
      CF_INFOBIP_DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn()
      }
    };

    mockRequest = {
      headers: {
        get: vi.fn()
      }
    };
  });

  describe('withAuth function', () => {
    it('should return authenticated user with valid session', async () => {
      // Mock valid session cookie
      mockRequest.headers.get.mockReturnValue('session=valid-token');
      
      // Mock JWT verification
      vi.doMock('../functions/middleware/auth.js', () => ({
        verifyJWT: vi.fn().mockResolvedValue({ sub: 'test-google-id' })
      }));

      // Mock database query
      mockEnv.CF_INFOBIP_DB.first.mockResolvedValue(mockUser);

      const result = await withAuth(mockRequest, mockEnv);

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should return unauthenticated with no session cookie', async () => {
      mockRequest.headers.get.mockReturnValue(null);

      const result = await withAuth(mockRequest, mockEnv);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('No session token found');
    });

    it('should return unauthenticated with invalid token', async () => {
      mockRequest.headers.get.mockReturnValue('session=invalid-token');
      
      vi.doMock('../functions/middleware/auth.js', () => ({
        verifyJWT: vi.fn().mockResolvedValue(null)
      }));

      const result = await withAuth(mockRequest, mockEnv);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should return unauthenticated when user not found in database', async () => {
      mockRequest.headers.get.mockReturnValue('session=valid-token');
      
      vi.doMock('../functions/middleware/auth.js', () => ({
        verifyJWT: vi.fn().mockResolvedValue({ sub: 'test-google-id' })
      }));

      mockEnv.CF_INFOBIP_DB.first.mockResolvedValue(null);

      const result = await withAuth(mockRequest, mockEnv);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('createProtectedRoute function', () => {
    it('should call handler with user context when authenticated', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      );

      const protectedHandler = createProtectedRoute(mockHandler);

      mockRequest.headers.get.mockReturnValue('session=valid-token');
      
      vi.doMock('../functions/middleware/auth.js', () => ({
        withAuth: vi.fn().mockResolvedValue({
          authenticated: true,
          user: mockUser
        })
      }));

      const mockContext = {
        env: mockEnv,
        request: mockRequest
      };

      const response = await protectedHandler(mockContext);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      const mockHandler = vi.fn();

      const protectedHandler = createProtectedRoute(mockHandler);

      mockRequest.headers.get.mockReturnValue(null);
      
      vi.doMock('../functions/middleware/auth.js', () => ({
        withAuth: vi.fn().mockResolvedValue({
          authenticated: false,
          error: 'No session token found'
        })
      }));

      const mockContext = {
        env: mockEnv,
        request: mockRequest
      };

      const response = await protectedHandler(mockContext);

      expect(response.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
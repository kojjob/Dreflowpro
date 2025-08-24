/**
 * Authentication Error Handling Tests
 * Tests for token refresh errors and session expiry scenarios
 */

import { AuthService } from '../auth';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService Error Handling', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    authService.cleanup();
  });

  describe('Token Refresh Error Handling', () => {
    it('should handle invalid refresh token error correctly', async () => {
      // Setup: Mock tokens in state
      const mockTokens = {
        access_token: 'expired.access.token',
        refresh_token: 'invalid.refresh.token'
      };
      
      authService['updateState']({
        tokens: mockTokens,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }
      });

      // Mock fetch to return 401 with "Invalid refresh token"
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://localhost:8000/api/v1/auth/refresh',
        json: async () => ({ detail: 'Invalid refresh token' })
      });

      // Attempt to refresh token
      await expect(authService.refreshAccessToken()).rejects.toThrow('Invalid refresh token');
    });

    it('should handle network errors during token refresh', async () => {
      // Setup: Mock tokens in state
      const mockTokens = {
        access_token: 'expired.access.token',
        refresh_token: 'valid.refresh.token'
      };
      
      authService['updateState']({
        tokens: mockTokens,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }
      });

      // Mock fetch to throw network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Attempt to refresh token
      await expect(authService.refreshAccessToken()).rejects.toThrow('Network error');
    });

    it('should handle malformed response during token refresh', async () => {
      // Setup: Mock tokens in state
      const mockTokens = {
        access_token: 'expired.access.token',
        refresh_token: 'valid.refresh.token'
      };
      
      authService['updateState']({
        tokens: mockTokens,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }
      });

      // Mock fetch to return 500 with malformed JSON
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://localhost:8000/api/v1/auth/refresh',
        json: async () => { throw new Error('Invalid JSON'); }
      });

      // Attempt to refresh token
      await expect(authService.refreshAccessToken()).rejects.toThrow('Token refresh failed (500)');
    });
  });

  describe('Authentication State Validation', () => {
    it('should validate authentication state correctly when no tokens', () => {
      const result = authService.validateAuthenticationState();
      expect(result).toEqual({
        isValid: false,
        reason: 'No tokens available'
      });
    });

    it('should validate authentication state correctly when tokens are malformed', () => {
      authService['updateState']({
        tokens: { access_token: '', refresh_token: 'valid.token' },
        isAuthenticated: true
      });

      const result = authService.validateAuthenticationState();
      expect(result).toEqual({
        isValid: false,
        reason: 'Invalid token format'
      });
    });

    it('should provide debug information for troubleshooting', () => {
      // Test with no tokens
      let debugInfo = authService.getDebugInfo();
      expect(debugInfo).toEqual({ hasTokens: false });

      // Test with valid tokens (mocked)
      const mockTokens = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNjk5OTk5OTk5fQ.test',
        refresh_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNjk5OTk5OTk5fQ.test'
      };
      
      authService['updateState']({
        tokens: mockTokens,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }
      });

      debugInfo = authService.getDebugInfo();
      expect(debugInfo).toHaveProperty('hasTokens', true);
      expect(debugInfo).toHaveProperty('accessToken');
      expect(debugInfo).toHaveProperty('refreshToken');
      expect(debugInfo).toHaveProperty('isAuthenticated', true);
    });
  });

  describe('Error Logging', () => {
    it('should log detailed error information during token refresh failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Setup: Mock tokens in state
      const mockTokens = {
        access_token: 'expired.access.token',
        refresh_token: 'invalid.refresh.token'
      };
      
      authService['updateState']({
        tokens: mockTokens,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' }
      });

      // Mock fetch to return 401 with error details
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://localhost:8000/api/v1/auth/refresh',
        json: async () => ({ detail: 'Invalid refresh token' })
      });

      // Attempt to refresh token
      try {
        await authService.refreshAccessToken();
      } catch (error) {
        // Expected to throw
      }

      // Verify error logging
      expect(consoleSpy).toHaveBeenCalledWith(
        'Token refresh error:',
        expect.objectContaining({
          status: 401,
          statusText: 'Unauthorized',
          url: 'http://localhost:8000/api/v1/auth/refresh',
          errorMessage: 'Invalid refresh token',
          errorData: { detail: 'Invalid refresh token' }
        })
      );

      consoleSpy.mockRestore();
    });
  });
});

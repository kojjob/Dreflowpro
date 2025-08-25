/**
 * Token Manager - Authentication utility for API service
 * Handles token operations without circular dependencies with AuthContext
 */

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiresAt: string;
}

class TokenManager {
  private static instance: TokenManager;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get stored tokens from session storage
   */
  getStoredToken(): TokenData | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const accessToken = sessionStorage.getItem('access_token');
      const refreshToken = sessionStorage.getItem('refresh_token');
      const expiresAt = sessionStorage.getItem('token_expires_at');
      
      if (accessToken) {
        return {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expiresAt: expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to retrieve stored token:', error);
      return null;
    }
  }

  /**
   * Check if current token is valid and not expired
   */
  isTokenValid(): boolean {
    const tokenData = this.getStoredToken();
    if (!tokenData) return false;

    try {
      const expiresAt = new Date(tokenData.expiresAt);
      const now = new Date();
      // Add 5 minute buffer for token refresh
      const bufferTime = 5 * 60 * 1000; 
      
      return expiresAt.getTime() > (now.getTime() + bufferTime);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get access token string
   */
  getAccessToken(): string | null {
    const tokenData = this.getStoredToken();

    if (tokenData && this.isTokenValid()) {
      return tokenData.access_token;
    }

    return null;
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const tokenData = this.getStoredToken();

    if (tokenData && this.isTokenValid()) {
      return {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      };
    }

    return {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Clear stored tokens (for logout)
   */
  clearTokens(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('token_expires_at');
      }
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokenData = this.getStoredToken();
    if (!tokenData) return false;
    
    return this.isTokenValid();
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();
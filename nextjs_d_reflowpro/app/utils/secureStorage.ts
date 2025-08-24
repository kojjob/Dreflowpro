/**
 * Secure Token Storage Utility
 * Uses httpOnly cookies for secure token storage to prevent XSS attacks
 */

import { cookies } from 'next/headers';

export interface SecureTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

class SecureStorage {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static TOKEN_EXPIRES_KEY = 'token_expires_at';

  /**
   * Check if we're in a browser environment
   */
  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Store tokens securely in httpOnly cookies
   * Note: This method should be called from server-side actions/API routes
   */
  static async storeTokensSecure(tokens: SecureTokens): Promise<void> {
    if (this.isBrowser()) {
      throw new Error('storeTokensSecure should only be called server-side');
    }

    const cookieStore = cookies();
    const maxAge = tokens.expires_in ? tokens.expires_in : 3600; // 1 hour default

    // Store access token (shorter expiry)
    cookieStore.set(this.ACCESS_TOKEN_KEY, tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge,
      path: '/'
    });

    // Store refresh token (longer expiry)
    cookieStore.set(this.REFRESH_TOKEN_KEY, tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Store token expiration time
    if (tokens.expires_in) {
      const expiresAt = Date.now() + (tokens.expires_in * 1000);
      cookieStore.set(this.TOKEN_EXPIRES_KEY, expiresAt.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAge,
        path: '/'
      });
    }
  }

  /**
   * Get tokens from httpOnly cookies
   * Note: This method should be called from server-side
   */
  static async getTokensSecure(): Promise<SecureTokens | null> {
    if (this.isBrowser()) {
      throw new Error('getTokensSecure should only be called server-side');
    }

    try {
      const cookieStore = cookies();
      
      const accessToken = cookieStore.get(this.ACCESS_TOKEN_KEY)?.value;
      const refreshToken = cookieStore.get(this.REFRESH_TOKEN_KEY)?.value;

      if (!accessToken || !refreshToken) {
        return null;
      }

      const expiresAt = cookieStore.get(this.TOKEN_EXPIRES_KEY)?.value;
      const expiresIn = expiresAt ? Math.max(0, Math.floor((parseInt(expiresAt) - Date.now()) / 1000)) : undefined;

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: expiresIn
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear stored tokens from cookies
   */
  static async clearTokensSecure(): Promise<void> {
    if (this.isBrowser()) {
      throw new Error('clearTokensSecure should only be called server-side');
    }

    const cookieStore = cookies();
    
    cookieStore.delete(this.ACCESS_TOKEN_KEY);
    cookieStore.delete(this.REFRESH_TOKEN_KEY);
    cookieStore.delete(this.TOKEN_EXPIRES_KEY);
  }

  /**
   * Browser-side fallback methods for development/transition period
   * These use localStorage but with enhanced security measures
   */
  static storeTokensFallback(tokens: SecureTokens): void {
    if (!this.isBrowser()) return;

    try {
      // Encrypt tokens before storing (basic obfuscation)
      const encrypted = this.encryptBasic(JSON.stringify(tokens));
      
      localStorage.setItem('secure_tokens', encrypted);
      
      // Store expiration time
      if (tokens.expires_in) {
        const expiresAt = Date.now() + (tokens.expires_in * 1000);
        localStorage.setItem('secure_expires_at', expiresAt.toString());
      }
    } catch (error) {
      console.warn('Failed to store tokens in fallback storage:', error);
    }
  }

  /**
   * Get tokens from browser fallback storage
   */
  static getTokensFallback(): SecureTokens | null {
    if (!this.isBrowser()) return null;

    try {
      const encrypted = localStorage.getItem('secure_tokens');
      if (!encrypted) return null;

      const decrypted = this.decryptBasic(encrypted);
      const tokens = JSON.parse(decrypted) as SecureTokens;

      // Check if tokens are expired
      const expiresAt = localStorage.getItem('secure_expires_at');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        this.clearTokensFallback();
        return null;
      }

      return tokens;
    } catch (error) {
      // Clear corrupted data
      this.clearTokensFallback();
      return null;
    }
  }

  /**
   * Clear tokens from browser fallback storage
   */
  static clearTokensFallback(): void {
    if (!this.isBrowser()) return;

    localStorage.removeItem('secure_tokens');
    localStorage.removeItem('secure_expires_at');
    
    // Also clear old token storage format for migration
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
  }

  /**
   * Basic encryption for client-side storage (obfuscation only)
   * Note: This is not cryptographically secure, just basic obfuscation
   */
  private static encryptBasic(text: string): string {
    return btoa(encodeURIComponent(text));
  }

  /**
   * Basic decryption for client-side storage
   */
  private static decryptBasic(encrypted: string): string {
    return decodeURIComponent(atob(encrypted));
  }

  /**
   * Migration helper to move from localStorage to secure storage
   */
  static migrateFromLocalStorage(): SecureTokens | null {
    if (!this.isBrowser()) return null;

    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const expiresAt = localStorage.getItem('token_expires_at');

      if (accessToken && refreshToken) {
        const tokens: SecureTokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: expiresAt ? Math.max(0, Math.floor((parseInt(expiresAt) - Date.now()) / 1000)) : undefined
        };

        // Store in new secure format
        this.storeTokensFallback(tokens);
        
        // Clear old storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');

        return tokens;
      }
    } catch (error) {
      console.warn('Failed to migrate tokens from localStorage:', error);
    }

    return null;
  }

  /**
   * Check if tokens exist in any storage
   */
  static hasTokens(): boolean {
    if (this.isBrowser()) {
      // Check fallback storage first
      const fallbackTokens = this.getTokensFallback();
      if (fallbackTokens) return true;

      // Check old localStorage format
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      return !!(accessToken && refreshToken);
    }
    return false;
  }
}

export default SecureStorage;
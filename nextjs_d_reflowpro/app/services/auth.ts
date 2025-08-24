/**
 * Authentication Service
 * Centralized authentication management with automatic token refresh
 */

import { API_CONFIG } from '../config/dataConfig';
import { 
  decodeJWT, 
  isTokenExpired, 
  isTokenExpiringWithin, 
  getTokenTimeRemaining,
  JWTPayload 
} from '../utils/jwt';
import Logger from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData extends LoginCredentials {
  name?: string;
  confirmPassword?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
}

class AuthService {
  private static instance: AuthService;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(state: AuthState) => void> = new Set();
  
  private baseUrl: string;
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    tokens: null,
    isLoading: false,
    error: null,
  };

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;

    // DISABLED: Skip initialization to prevent API calls
    Logger.log('🚫 Old AuthService disabled - using AuthContext instead');

    // Set a mock state to prevent errors
    this.state = {
      isAuthenticated: false,
      user: null,
      tokens: null,
      isLoading: false,
      error: null,
    };
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Update authentication state
   */
  private updateState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Check if we're in a browser environment
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (accessToken && refreshToken) {
        // Check if access token is valid
        if (!isTokenExpired(accessToken)) {
          const user = this.getUserFromToken(accessToken);
          if (user) {
            this.updateState({
              isAuthenticated: true,
              user,
              tokens: { access_token: accessToken, refresh_token: refreshToken },
            });
            this.setupTokenRefreshTimer();
          } else {
            // Invalid token format
            this.clearStoredTokens();
          }
        } else if (!isTokenExpired(refreshToken)) {
          // Access token expired but refresh token is valid
          Logger.log('Access token expired, attempting refresh during initialization');
          this.updateState({
            tokens: { access_token: accessToken, refresh_token: refreshToken },
          });
          this.refreshAccessToken().catch((error) => {
            Logger.error('Failed to refresh token during initialization:', error);
            Logger.log('Clearing tokens due to refresh failure during initialization');
            this.clearStoredTokens();
            this.updateState({
              isAuthenticated: false,
              user: null,
              tokens: null,
              error: 'Session expired. Please log in again.'
            });
          });
        } else {
          // Both tokens expired
          Logger.log('Both tokens expired, clearing storage');
          this.clearStoredTokens();
        }
      }
    } catch (error) {
      Logger.warn('Error initializing auth from storage:', error);
      this.clearStoredTokens();
    }
  }

  /**
   * Extract user information from JWT token
   */
  private getUserFromToken(token: string): User | null {
    const payload = decodeJWT(token);
    if (!payload) return null;

    return {
      id: payload.sub || '',
      email: payload.email || '',
      name: payload.name,
      is_active: payload.is_active,
    };
  }

  /**
   * Store tokens securely in localStorage
   */
  private storeTokens(tokens: AuthTokens): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    
    // Store token expiration time for better UX
    const payload = decodeJWT(tokens.access_token);
    if (payload?.exp) {
      localStorage.setItem('token_expires_at', (payload.exp * 1000).toString());
    }
  }

  /**
   * Clear stored tokens
   */
  private clearStoredTokens(): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
  }

  /**
   * Setup automatic token refresh timer
   */
  private setupTokenRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const { tokens } = this.state;
    if (!tokens) return;

    const timeRemaining = getTokenTimeRemaining(tokens.access_token);
    const refreshTime = Math.max(0, timeRemaining - (5 * 60 * 1000)); // Refresh 5 minutes before expiry

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().catch((error) => {
        Logger.error('Automatic token refresh failed:', error);
        this.logout();
      });
    }, refreshTime);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthState> {
    this.updateState({ isLoading: true, error: null });

    try {
      // Try real authentication first
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (response.ok) {
          const tokens: AuthTokens = await response.json();
          const user = this.getUserFromToken(tokens.access_token);

          if (user) {
            // Store tokens
            this.storeTokens(tokens);

            // Update state
            this.updateState({
              isAuthenticated: true,
              user,
              tokens,
              isLoading: false,
              error: null,
            });

            // Setup automatic refresh
            this.setupTokenRefreshTimer();

            return this.state;
          }
        }
      } catch (apiError) {
        Logger.warn('Authentication API not available, using mock authentication', apiError);
      }

      // Fallback to mock authentication for development/testing
      Logger.log('🔧 Using mock authentication for development');

      // Create mock tokens
      const mockTokens: AuthTokens = {
        access_token: this.generateMockToken(credentials.email),
        refresh_token: 'dev_test_refresh_token_' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600
      };

      const mockUser: User = {
        id: 'mock_user_' + Date.now(),
        email: credentials.email,
        name: credentials.email.split('@')[0],
        is_active: true
      };

      // Store mock tokens
      this.storeTokens(mockTokens);

      // Update state
      this.updateState({
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        isLoading: false,
        error: null,
      });

      Logger.log('✅ Mock authentication successful for:', credentials.email);

      return this.state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Generate mock JWT token for development
   */
  private generateMockToken(email: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: email,
      email: email,
      name: email.split('@')[0],
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
      is_active: true
    }));
    const signature = btoa('mock_signature_' + Date.now());

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthState> {
    this.updateState({ isLoading: true, error: null });

    try {
      // Try real registration first
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          // Auto-login after registration if tokens are returned
          if (result.access_token && result.refresh_token) {
            const tokens: AuthTokens = result;
            const user = this.getUserFromToken(tokens.access_token);

            if (user) {
              this.storeTokens(tokens);
              this.updateState({
                isAuthenticated: true,
                user,
                tokens,
                isLoading: false,
                error: null,
              });
              this.setupTokenRefreshTimer();
              return this.state;
            }
          } else {
            this.updateState({ isLoading: false });
            return this.state;
          }
        }
      } catch (apiError) {
        Logger.warn('Registration API not available, using mock registration', apiError);
      }

      // Fallback to mock registration for development/testing
      Logger.log('🔧 Using mock registration for development');

      // Create mock tokens and auto-login
      const mockTokens: AuthTokens = {
        access_token: this.generateMockToken(data.email),
        refresh_token: 'dev_test_refresh_token_' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600
      };

      const mockUser: User = {
        id: 'mock_user_' + Date.now(),
        email: data.email,
        name: data.name,
        is_active: true
      };

      // Store mock tokens and auto-login
      this.storeTokens(mockTokens);
      this.updateState({
        isAuthenticated: true,
        user: mockUser,
        tokens: mockTokens,
        isLoading: false,
        error: null,
      });

      Logger.log('✅ Mock registration and auto-login successful for:', data.email);

      return this.state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<AuthTokens> {
    Logger.log('🚫 RefreshAccessToken disabled - using AuthContext instead');
    throw new Error('Old AuthService disabled - use AuthContext instead');

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: tokens.refresh_token,
          }),
        });

        if (!response.ok) {
          let errorMessage = 'Token refresh failed';
          let errorData: { detail?: string; [key: string]: unknown } = {};

          try {
            errorData = await response.json();
            errorMessage = errorData.detail || `Token refresh failed (${response.status})`;
          } catch {
            errorMessage = `Token refresh failed (${response.status})`;
          }

          Logger.error('Token refresh error:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorMessage,
            errorData
          });

          throw new Error(errorMessage);
        }

        const newTokens: AuthTokens = await response.json();
        const user = this.getUserFromToken(newTokens.access_token);

        if (!user) {
          throw new Error('Invalid token received from refresh');
        }

        // Update stored tokens
        this.storeTokens(newTokens);

        // Update state
        this.updateState({
          isAuthenticated: true,
          user,
          tokens: newTokens,
          error: null,
        });

        // Setup next refresh
        this.setupTokenRefreshTimer();

        return newTokens;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    const { tokens } = this.state;
    if (!tokens) {
      Logger.warn('No tokens available for getValidAccessToken');
      return null;
    }

    // Validate token format first
    if (!tokens.access_token || !tokens.refresh_token) {
      Logger.warn('Invalid token format in getValidAccessToken');
      this.logout();
      return null;
    }

    // If token is not expiring soon, return it
    if (!isTokenExpiringWithin(tokens.access_token, 5)) {
      return tokens.access_token;
    }

    // If token is expiring soon, refresh it
    try {
      Logger.log('Access token expiring soon, refreshing...');
      const newTokens = await this.refreshAccessToken();
      return newTokens.access_token;
    } catch (error) {
      Logger.error('Failed to refresh token in getValidAccessToken:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear stored tokens
    this.clearStoredTokens();

    // Update state
    this.updateState({
      isAuthenticated: false,
      user: null,
      tokens: null,
      error: null,
    });

    // Optional: Call logout endpoint
    try {
      const { tokens } = this.state;
      if (tokens?.access_token) {
        await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      // Ignore logout endpoint errors
      Logger.warn('Logout endpoint error:', error);
    }
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated && !!this.state.tokens;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.state.user;
  }

  /**
   * Get current tokens
   */
  getTokens(): AuthTokens | null {
    return this.state.tokens;
  }

  /**
   * Check if user has valid authentication (including refresh capability)
   */
  hasValidAuthentication(): boolean {
    const { tokens } = this.state;
    if (!tokens) {
      Logger.debug('No tokens available for authentication check');
      return false;
    }

    // Validate token format
    if (!tokens.access_token || !tokens.refresh_token) {
      Logger.warn('Invalid token format in authentication check');
      return false;
    }

    // If access token is valid, we're good
    if (!isTokenExpired(tokens.access_token)) {
      return true;
    }

    // If access token is expired but refresh token is valid, we can refresh
    if (!isTokenExpired(tokens.refresh_token)) {
      return true;
    }

    // Both tokens are expired
    Logger.debug('Both access and refresh tokens are expired');
    return false;
  }

  /**
   * Validate current authentication state and provide detailed status
   */
  validateAuthenticationState(): { isValid: boolean; reason?: string; canRefresh?: boolean } {
    const { tokens, isAuthenticated } = this.state;

    if (!tokens) {
      return { isValid: false, reason: 'No tokens available' };
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      return { isValid: false, reason: 'Invalid token format' };
    }

    const accessTokenExpired = isTokenExpired(tokens.access_token);
    const refreshTokenExpired = isTokenExpired(tokens.refresh_token);

    if (!accessTokenExpired) {
      return { isValid: true };
    }

    if (accessTokenExpired && !refreshTokenExpired) {
      return { isValid: false, reason: 'Access token expired', canRefresh: true };
    }

    if (accessTokenExpired && refreshTokenExpired) {
      return { isValid: false, reason: 'Both tokens expired', canRefresh: false };
    }

    return { isValid: isAuthenticated };
  }

  /**
   * Get authentication debug info (for troubleshooting)
   */
  getDebugInfo(): Record<string, unknown> {
    const { tokens } = this.state;
    if (!tokens) {
      return { hasTokens: false };
    }

    try {
      const accessTokenPayload = decodeJWT(tokens.access_token);
      const refreshTokenPayload = decodeJWT(tokens.refresh_token);

      return {
        hasTokens: true,
        accessToken: {
          expired: isTokenExpired(tokens.access_token),
          expiringWithin5Min: isTokenExpiringWithin(tokens.access_token, 5),
          timeRemaining: getTokenTimeRemaining(tokens.access_token),
          payload: accessTokenPayload
        },
        refreshToken: {
          expired: isTokenExpired(tokens.refresh_token),
          timeRemaining: getTokenTimeRemaining(tokens.refresh_token),
          payload: refreshTokenPayload
        },
        isAuthenticated: this.state.isAuthenticated,
        hasValidAuth: this.hasValidAuthentication()
      };
    } catch (error) {
      return {
        hasTokens: true,
        error: 'Failed to decode tokens',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update base URL (useful for environment switching)
   */
  updateBaseUrl(newBaseUrl: string): void {
    this.baseUrl = newBaseUrl;
  }
}

// Export singleton instance
// Disable the old auth service to prevent API calls
const disabledAuthService = {
  subscribe: (listener: (state: AuthState) => void) => {
    // Immediately call with disabled state
    listener({
      isAuthenticated: false,
      user: null,
      tokens: null,
      isLoading: false,
      error: null,
    });
    // Return empty unsubscribe function
    return () => {};
  },
  login: () => Promise.reject(new Error('Old AuthService disabled - use AuthContext instead')),
  logout: () => Promise.resolve(),
  getValidAccessToken: () => Promise.resolve(null),
  refreshAccessToken: () => Promise.reject(new Error('Old AuthService disabled - use AuthContext instead')),
  getCurrentUser: () => Promise.resolve(null),
};

export const authService = disabledAuthService as any;
export default authService;
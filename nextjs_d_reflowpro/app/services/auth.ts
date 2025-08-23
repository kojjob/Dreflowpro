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
    this.initializeFromStorage();
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
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (accessToken && refreshToken) {
        // Check if access token is valid
        if (!isTokenExpired(accessToken)) {
          const user = this.getUserFromToken(accessToken);
          this.updateState({
            isAuthenticated: true,
            user,
            tokens: { access_token: accessToken, refresh_token: refreshToken },
          });
          this.setupTokenRefreshTimer();
        } else if (!isTokenExpired(refreshToken)) {
          // Access token expired but refresh token is valid
          this.updateState({
            tokens: { access_token: accessToken, refresh_token: refreshToken },
          });
          this.refreshAccessToken().catch(() => {
            this.logout();
          });
        } else {
          // Both tokens expired
          this.clearStoredTokens();
        }
      }
    } catch (error) {
      console.warn('Error initializing auth from storage:', error);
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
        console.error('Automatic token refresh failed:', error);
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
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const tokens: AuthTokens = await response.json();
      const user = this.getUserFromToken(tokens.access_token);

      if (!user) {
        throw new Error('Invalid token received');
      }

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
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthState> {
    this.updateState({ isLoading: true, error: null });

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed');
      }

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
        }
      } else {
        this.updateState({ isLoading: false });
      }

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
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const { tokens } = this.state;
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

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
          throw new Error('Token refresh failed');
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
    if (!tokens) return null;

    // If token is not expiring soon, return it
    if (!isTokenExpiringWithin(tokens.access_token, 5)) {
      return tokens.access_token;
    }

    // If token is expiring soon, refresh it
    try {
      const newTokens = await this.refreshAccessToken();
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
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
      console.warn('Logout endpoint error:', error);
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
   * Update base URL (useful for environment switching)
   */
  updateBaseUrl(newBaseUrl: string): void {
    this.baseUrl = newBaseUrl;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
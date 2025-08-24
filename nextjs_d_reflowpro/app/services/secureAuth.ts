/**
 * Secure Authentication Service
 * Uses secure cookie-based storage and server-side authentication
 */

import SecureStorage from '../utils/secureStorage';
import Logger from '../utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData extends LoginCredentials {
  name?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  confirmPassword?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

class SecureAuthService {
  private static instance: SecureAuthService;
  private listeners: Set<(state: AuthState) => void> = new Set();
  
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  };

  constructor() {
    this.initializeFromServer();
  }

  public static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
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
    return typeof window !== 'undefined';
  }

  /**
   * Initialize authentication state from server
   */
  private async initializeFromServer(): Promise<void> {
    if (!this.isBrowser()) return;

    try {
      this.updateState({ isLoading: true, error: null });

      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.authenticated) {
          this.updateState({
            isAuthenticated: true,
            user: data.user,
            isLoading: false,
            error: null,
          });
        } else {
          // Handle migration from old localStorage
          await this.attemptMigration();
        }
      } else {
        // Not authenticated or error
        await this.attemptMigration();
      }
    } catch (error) {
      Logger.error('Failed to initialize auth from server:', error);
      await this.attemptMigration();
    }
  }

  /**
   * Attempt to migrate from old localStorage-based auth
   */
  private async attemptMigration(): Promise<void> {
    try {
      const migratedTokens = SecureStorage.migrateFromLocalStorage();
      
      if (migratedTokens) {
        Logger.log('Migrating authentication tokens to secure storage');
        
        // Store in fallback secure storage temporarily
        SecureStorage.storeTokensFallback(migratedTokens);
        
        // Try to validate with server
        await this.initializeFromServer();
      } else {
        // No tokens to migrate
        this.updateState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      Logger.error('Migration failed:', error);
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    }
  }

  /**
   * Login with email and password using secure server-side authentication
   */
  async login(credentials: LoginCredentials): Promise<AuthState> {
    this.updateState({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/auth/secure-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for secure storage
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.updateState({
          isAuthenticated: true,
          user: data.user,
          isLoading: false,
          error: null,
        });

        Logger.log('✅ Secure authentication successful for:', credentials.email);
      } else {
        this.updateState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: data.error || 'Login failed',
        });
      }

      return this.state;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
      Logger.error('Secure login error:', error);
      return this.state;
    }
  }

  /**
   * Register new user with secure authentication
   */
  async register(data: RegisterData): Promise<AuthState> {
    this.updateState({ isLoading: true, error: null });

    try {
      // First register the user
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          first_name: data.first_name || data.name?.split(' ')[0] || '',
          last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
          organization_name: data.organization_name,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // If registration returns tokens, store them securely
        if (result.access_token && result.refresh_token) {
          // Use secure login to store tokens properly
          return await this.login({ email: data.email, password: data.password });
        } else {
          // Registration successful but requires login
          this.updateState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
          });
          return this.state;
        }
      } else {
        const errorData = await response.json();
        this.updateState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: errorData.detail || 'Registration failed',
        });
        return this.state;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.updateState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
      Logger.error('Secure registration error:', error);
      return this.state;
    }
  }

  /**
   * Logout user with secure cookie clearing
   */
  async logout(): Promise<void> {
    try {
      // Call secure logout endpoint
      await fetch('/api/auth/secure-logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear fallback storage as well
      SecureStorage.clearTokensFallback();

      this.updateState({
        isAuthenticated: false,
        user: null,
        error: null,
      });

      Logger.log('✅ Secure logout successful');
    } catch (error) {
      Logger.error('Secure logout error:', error);
      
      // Still update state to logged out
      this.updateState({
        isAuthenticated: false,
        user: null,
        error: null,
      });
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
    return this.state.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.state.user;
  }

  /**
   * Refresh authentication status from server
   */
  async refreshAuthStatus(): Promise<void> {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.authenticated) {
          this.updateState({
            isAuthenticated: true,
            user: data.user,
            error: null,
          });
        } else {
          this.updateState({
            isAuthenticated: false,
            user: null,
            error: data.error || 'Not authenticated',
          });
        }
      } else {
        this.updateState({
          isAuthenticated: false,
          user: null,
          error: 'Failed to check authentication status',
        });
      }
    } catch (error) {
      Logger.error('Failed to refresh auth status:', error);
      this.updateState({
        isAuthenticated: false,
        user: null,
        error: 'Failed to check authentication status',
      });
    }
  }

  /**
   * Check if authentication exists in any storage (for migration)
   */
  hasStoredAuth(): boolean {
    return SecureStorage.hasTokens();
  }
}

// Export singleton instance
export const secureAuthService = SecureAuthService.getInstance();
export default secureAuthService;
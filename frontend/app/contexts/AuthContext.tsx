'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '../services/api';
import { User, UserSession } from '../types/user';
import { toast } from 'sonner';
import Logger from '../utils/logger';
import { env } from '../config/env';

interface AuthContextType {
  user: User | null;
  session: UserSession | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Secure token storage utilities with persistent option
  const getStoredToken = () => {
    try {
      if (typeof window === 'undefined') return null;
      
      // Check localStorage first (persistent), then sessionStorage (session-only)
      const rememberMe = localStorage.getItem('remember_me') === 'true';
      const storage = rememberMe ? localStorage : sessionStorage;
      
      const accessToken = storage.getItem('access_token') || sessionStorage.getItem('access_token');
      const refreshToken = storage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
      const expiresAt = storage.getItem('token_expires_at') || sessionStorage.getItem('token_expires_at');
      
      if (accessToken) {
        return {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expiresAt: expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };
      }
      
      return null;
    } catch (error) {
      Logger.error('Error retrieving stored tokens:', error);
      return null;
    }
  };

  const setStoredTokens = (accessToken: string, refreshToken?: string, expiresAt?: string, rememberMe: boolean = true) => {
    try {
      if (typeof window === 'undefined') return;
      
      // Use localStorage for persistent storage if rememberMe is true
      const storage = rememberMe ? localStorage : sessionStorage;
      
      // Store in appropriate storage
      storage.setItem('access_token', accessToken);
      if (refreshToken) {
        storage.setItem('refresh_token', refreshToken);
      }
      if (expiresAt) {
        storage.setItem('token_expires_at', expiresAt);
      }
      
      // Store remember me preference
      localStorage.setItem('remember_me', rememberMe.toString());
      
      // Clear from the other storage type to avoid conflicts
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('access_token');
      otherStorage.removeItem('refresh_token');
      otherStorage.removeItem('token_expires_at');
    } catch (error) {
      Logger.error('Error storing tokens:', error);
    }
  };

  const clearStoredTokens = () => {
    try {
      if (typeof window === 'undefined') return;
      
      // Clear all authentication-related data from both storages
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token_expires_at');
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');
      localStorage.removeItem('remember_me');
    } catch (error) {
      Logger.error('Error clearing stored tokens:', error);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up token refresh interval - more aggressive refresh
  useEffect(() => {
    if (session?.token) {
      // Check token immediately on mount
      refreshTokenIfNeeded();
      
      // Then check every 3 minutes (more frequent to prevent expiry)
      const refreshInterval = setInterval(() => {
        refreshTokenIfNeeded();
      }, 3 * 60 * 1000); // Check every 3 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [session]);

  const initializeAuth = async () => {
    Logger.log('🔐 Initializing authentication...');
    setLoading(true);

    try {
      // Check for existing session in secure storage
      const existingToken = getStoredToken();
      
      if (existingToken) {
        Logger.log('🔐 Found existing token, validating...');
        
        try {
          // Try to get current user with existing token
          const userData = await apiService.getCurrentUser();
          
          if (userData) {
            setUser(userData);
            setSession({
              user: userData,
              token: existingToken.access_token,
              refreshToken: existingToken.refresh_token,
              expiresAt: existingToken.expiresAt,
              permissions: userData.role?.permissions || []
            });
            setError(null);
            Logger.log('🔐 User authenticated successfully');
            return;
          }
        } catch (error) {
          Logger.warn('🔐 Stored token invalid, clearing session');
          clearStoredTokens();
        }
      }

      // No valid session found, but don't redirect - let protected routes handle it
      Logger.log('🔐 No valid session found');
      setUser(null);
      setSession(null);
      setError(null);
      
    } catch (error) {
      Logger.error('🔐 Authentication initialization failed:', error);
      setError('Authentication initialization failed');
      // Don't redirect here - let protected routes handle authentication
    } finally {
      setLoading(false);
    }
  };


  const login = async (email: string, password: string, rememberMe: boolean = true): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login({ email, password });
      
      if (response.access_token) {
        const expiresAt = getTokenExpiration(response.access_token);
        
        // Store tokens securely with remember me preference
        setStoredTokens(response.access_token, response.refresh_token, expiresAt, rememberMe);

        // Fetch user data
        const userData = await apiService.getCurrentUser();
        
        setUser(userData);
        setSession({
          user: userData,
          token: response.access_token,
          refreshToken: response.refresh_token || '',
          expiresAt,
          permissions: userData.role?.permissions || []
        });

        toast.success('Login successful');
        return true;
      }
      
      return false;
    } catch (error: any) {
      Logger.error('Login failed:', error);

      // Provide more specific error messages based on error type
      let userMessage = 'Login failed. Please check your credentials.';
      let errorMessage = error.message || 'Login failed';

      if (error.message?.includes('Backend service unavailable') ||
          error.message?.includes('Network connection failed') ||
          error.message?.includes('BACKEND_CONNECTION_ERROR')) {
        userMessage = 'Unable to connect to the server. Please try again later.';
        errorMessage = 'Backend service unavailable';
      } else if (error.message?.includes('Authentication failed')) {
        userMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('timeout')) {
        userMessage = 'Request timed out. Please check your connection and try again.';
      }

      setError(errorMessage);
      toast.error(userMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout API if available
      await apiService.logout().catch(() => {
        // Ignore logout API errors - still clear local state
      });
    } catch (error) {
      Logger.error('Logout API error:', error);
    } finally {
      // Always clear local state and stored tokens
      clearStoredTokens();
      setUser(null);
      setSession(null);
      setError(null);
      
      toast.success('Logged out successfully');
      router.push('/login');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      
      if (session) {
        setSession({
          ...session,
          user: userData
        });
      }
    } catch (error) {
      Logger.error('Failed to refresh user data:', error);
      setError('Failed to refresh user data');
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      Logger.log('🔐 Updating user profile with:', userData);
      const updatedUser = await apiService.updateUserProfile(userData);

      // Update user state
      setUser(updatedUser);

      // Update session with new user data
      if (session) {
        setSession({
          ...session,
          user: updatedUser
        });
      }

      Logger.log('🔐 User profile updated successfully:', updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      Logger.error('Failed to update user:', error);
      setError(error.message || 'Failed to update profile');
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const refreshTokenIfNeeded = async (): Promise<void> => {
    if (!session?.refreshToken) {
      Logger.warn('🔐 No refresh token available for refresh');
      return;
    }

    try {
      const expirationTime = new Date(session.expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Refresh if token expires in less than 10 minutes
      if (timeUntilExpiry < 10 * 60 * 1000) {
        Logger.log('🔐 Refreshing token, expires in', Math.round(timeUntilExpiry / 1000 / 60), 'minutes');
        
        const response = await apiService.refreshToken(session.refreshToken);
        
        if (response && response.access_token) {
          const newExpiresAt = getTokenExpiration(response.access_token);
          
          Logger.log('🔐 Token refreshed successfully, new expiry:', newExpiresAt);
          
          // Update stored tokens with the same rememberMe preference
          const rememberMe = localStorage.getItem('remember_me') === 'true';
          setStoredTokens(response.access_token, response.refresh_token || session.refreshToken, newExpiresAt, rememberMe);
          
          setSession(prev => prev ? {
            ...prev,
            token: response.access_token,
            refreshToken: response.refresh_token || prev.refreshToken,
            expiresAt: newExpiresAt
          } : null);
        } else {
          Logger.error('🔐 Token refresh response missing access_token:', response);
          throw new Error('Invalid token refresh response');
        }
      } else {
        Logger.debug('🔐 Token refresh not needed, expires in', Math.round(timeUntilExpiry / 1000 / 60), 'minutes');
      }
    } catch (error: any) {
      Logger.error('🔐 Token refresh failed:', error);
      
      // Don't force logout immediately for network errors - retry next time
      if (error?.message?.includes('fetch') || error?.message?.includes('Network') || error?.message?.includes('timeout')) {
        Logger.warn('🔐 Token refresh failed due to network error, will retry next time');
        return;
      }
      
      // Only force logout for actual authentication failures
      Logger.error('🔐 Authentication error, forcing logout');
      await logout();
    }
  };

  const getTokenExpiration = (token: string): string => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000).toISOString();
    } catch {
      // Default to 1 hour from now if can't parse
      return new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!session?.permissions) return false;
    return session.permissions.includes('all') || session.permissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    login,
    logout,
    refreshUser,
    updateUser,
    isAuthenticated: !!user && !!session,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

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
  login: (email: string, password: string) => Promise<boolean>;
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

  // Secure token storage utilities
  const getStoredToken = () => {
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
      Logger.error('Error retrieving stored tokens:', error);
      return null;
    }
  };

  const setStoredTokens = (accessToken: string, refreshToken?: string, expiresAt?: string) => {
    try {
      if (typeof window === 'undefined') return;
      
      sessionStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        sessionStorage.setItem('refresh_token', refreshToken);
      }
      if (expiresAt) {
        sessionStorage.setItem('token_expires_at', expiresAt);
      }
    } catch (error) {
      Logger.error('Error storing tokens:', error);
    }
  };

  const clearStoredTokens = () => {
    try {
      if (typeof window === 'undefined') return;
      
      // Clear all authentication-related data
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token_expires_at');
      
      // Also clear any legacy localStorage tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch (error) {
      Logger.error('Error clearing stored tokens:', error);
    }
  };

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (session?.token) {
      const refreshInterval = setInterval(() => {
        refreshTokenIfNeeded();
      }, 5 * 60 * 1000); // Check every 5 minutes

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

      // No valid session found, redirect to login
      Logger.log('🔐 No valid session found, redirecting to login');
      router.push('/login');

      // No valid session found, user needs to log in
      Logger.log('🔐 No valid session found');
      setUser(null);
      setSession(null);
      setError(null);
      
    } catch (error) {
      Logger.error('🔐 Authentication initialization failed:', error);
      setError('Authentication initialization failed');
      
      // On error, redirect to login
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };


  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login({ email, password });
      
      if (response.access_token) {
        const expiresAt = getTokenExpiration(response.access_token);
        
        // Store tokens securely
        setStoredTokens(response.access_token, response.refresh_token, expiresAt);

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
      setError(error.message || 'Login failed');
      toast.error('Login failed. Please check your credentials.');
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
    if (!session?.refreshToken) return;

    try {
      const expirationTime = new Date(session.expiresAt).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // Refresh if token expires in less than 10 minutes
      if (timeUntilExpiry < 10 * 60 * 1000) {
        const response = await apiService.refreshToken(session.refreshToken);
        
        if (response.access_token) {
          const newExpiresAt = getTokenExpiration(response.access_token);
          
          // Update stored tokens
          setStoredTokens(response.access_token, response.refresh_token || session.refreshToken, newExpiresAt);
          
          setSession(prev => prev ? {
            ...prev,
            token: response.access_token,
            refreshToken: response.refresh_token || prev.refreshToken,
            expiresAt: newExpiresAt
          } : null);
        }
      }
    } catch (error) {
      Logger.error('Token refresh failed:', error);
      // Force logout on refresh failure
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

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '../services/api';
import { User, UserSession } from '../types/user';
import { toast } from 'sonner';

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

  const initializeAuth = () => {
    console.log('🔐 Initializing authentication with direct mock data...');

    // Use direct mock data to avoid any async delays
    const mockUser = {
      id: '1',
      email: 'admin@dreflowpro.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      avatar: '',
      role: {
        id: '1',
        name: 'Admin',
        permissions: ['all'],
        color: 'red'
      },
      subscription: {
        id: '1',
        name: 'Pro',
        tier: 'paid',
        features: ['unlimited_pipelines', 'advanced_analytics'],
        limits: {
          pipelines: -1,
          dataProcessing: 1000,
          apiCalls: 100000,
          users: 10
        },
        isActive: true,
        canUpgrade: true
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          desktop: true,
          pipelineUpdates: true,
          systemAlerts: true,
          weeklyReports: false
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30000,
          showWelcome: true
        }
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
      isEmailVerified: true,
      isActive: true
    };

    console.log('🔐 Setting mock user data directly');
    setUser(mockUser);
    setSession({
      user: mockUser,
      token: 'mock_token',
      refreshToken: 'mock_refresh_token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      permissions: mockUser.role?.permissions || []
    });
    setError(null);
    setLoading(false);
    console.log('🔐 Mock user loaded instantly');
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login({ email, password });
      
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token || '');

        // Fetch user data
        const userData = await apiService.getCurrentUser();
        
        setUser(userData);
        setSession({
          user: userData,
          token: response.access_token,
          refreshToken: response.refresh_token || '',
          expiresAt: getTokenExpiration(response.access_token),
          permissions: userData.role?.permissions || []
        });

        toast.success('Login successful');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login failed:', error);
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
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
      console.error('Failed to refresh user data:', error);
      setError('Failed to refresh user data');
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      console.log('🔐 Updating user profile with:', userData);
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

      console.log('🔐 User profile updated successfully:', updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update user:', error);
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
          localStorage.setItem('access_token', response.access_token);
          
          setSession(prev => prev ? {
            ...prev,
            token: response.access_token,
            expiresAt: getTokenExpiration(response.access_token)
          } : null);
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
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

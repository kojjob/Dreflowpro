import { NextRequest, NextResponse } from 'next/server';
import SecureStorage from './secureStorage';
import { decodeJWT, isTokenExpired } from './jwt';
import Logger from './logger';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
    is_active?: boolean;
  };
}

/**
 * Middleware to validate authentication from secure cookies
 */
export async function validateAuthentication(request: NextRequest): Promise<{
  isValid: boolean;
  user?: any;
  error?: string;
  needsRefresh?: boolean;
}> {
  try {
    const tokens = await SecureStorage.getTokensSecure();
    
    if (!tokens || !tokens.access_token || !tokens.refresh_token) {
      return {
        isValid: false,
        error: 'No authentication tokens found'
      };
    }

    // Check if access token is expired
    if (isTokenExpired(tokens.access_token)) {
      // Check if refresh token is still valid
      if (!isTokenExpired(tokens.refresh_token)) {
        return {
          isValid: false,
          error: 'Access token expired',
          needsRefresh: true
        };
      } else {
        // Both tokens expired
        await SecureStorage.clearTokensSecure();
        return {
          isValid: false,
          error: 'Session expired'
        };
      }
    }

    // Extract user information from token
    const payload = decodeJWT(tokens.access_token);
    if (!payload) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    const user = {
      id: payload.sub || '',
      email: payload.email || '',
      name: payload.name,
      is_active: payload.is_active
    };

    return {
      isValid: true,
      user
    };

  } catch (error) {
    Logger.error('Authentication validation error:', error);
    
    // Clear potentially corrupted tokens
    try {
      await SecureStorage.clearTokensSecure();
    } catch (clearError) {
      Logger.error('Failed to clear corrupted tokens:', clearError);
    }

    return {
      isValid: false,
      error: 'Authentication validation failed'
    };
  }
}

/**
 * Middleware to refresh access token using refresh token
 */
export async function refreshAuthenticationTokens(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tokens = await SecureStorage.getTokensSecure();
    
    if (!tokens?.refresh_token) {
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      // Refresh failed, clear tokens
      await SecureStorage.clearTokensSecure();
      const errorData = await response.json().catch(() => ({ detail: 'Token refresh failed' }));
      
      return {
        success: false,
        error: errorData.detail || 'Token refresh failed'
      };
    }

    const newTokens = await response.json();
    
    // Store new tokens
    await SecureStorage.storeTokensSecure({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token, // Keep old refresh token if not provided
      token_type: newTokens.token_type || 'bearer',
      expires_in: newTokens.expires_in || 3600
    });

    Logger.log('Authentication tokens refreshed successfully');

    return {
      success: true
    };

  } catch (error) {
    Logger.error('Token refresh error:', error);
    
    // Clear tokens on error
    try {
      await SecureStorage.clearTokensSecure();
    } catch (clearError) {
      Logger.error('Failed to clear tokens after refresh error:', clearError);
    }

    return {
      success: false,
      error: 'Token refresh failed'
    };
  }
}

/**
 * Create an authentication middleware wrapper for API routes
 */
export function withAuth(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await validateAuthentication(request);

    if (!authResult.isValid) {
      if (authResult.needsRefresh) {
        // Attempt token refresh
        const refreshResult = await refreshAuthenticationTokens();
        
        if (refreshResult.success) {
          // Retry authentication validation
          const retryAuth = await validateAuthentication(request);
          
          if (retryAuth.isValid) {
            // Add user to request
            (request as AuthenticatedRequest).user = retryAuth.user;
            return handler(request as AuthenticatedRequest);
          }
        }
      }

      // Authentication failed
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Add user to request
    (request as AuthenticatedRequest).user = authResult.user;
    
    return handler(request as AuthenticatedRequest);
  };
}

/**
 * Get current user from secure storage
 */
export async function getCurrentUserFromTokens(): Promise<any | null> {
  const authResult = await validateAuthentication({} as NextRequest);
  return authResult.isValid ? authResult.user : null;
}
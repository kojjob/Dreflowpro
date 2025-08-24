import { NextRequest, NextResponse } from 'next/server';
import { validateAuthentication, refreshAuthenticationTokens } from '../../../utils/authMiddleware';
import Logger from '../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuthentication(request);

    if (!authResult.isValid) {
      if (authResult.needsRefresh) {
        // Attempt to refresh tokens
        const refreshResult = await refreshAuthenticationTokens();
        
        if (refreshResult.success) {
          // Retry authentication after refresh
          const retryAuth = await validateAuthentication(request);
          
          if (retryAuth.isValid) {
            return NextResponse.json({
              authenticated: true,
              user: retryAuth.user,
              refreshed: true
            });
          }
        }
        
        // Refresh failed
        return NextResponse.json({
          authenticated: false,
          error: refreshResult.error || 'Token refresh failed',
          code: 'TOKEN_REFRESH_FAILED'
        });
      }

      // Not authenticated
      return NextResponse.json({
        authenticated: false,
        error: authResult.error || 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Successfully authenticated
    return NextResponse.json({
      authenticated: true,
      user: authResult.user
    });

  } catch (error) {
    Logger.error('Auth status check error:', error);
    
    return NextResponse.json({
      authenticated: false,
      error: 'Authentication status check failed',
      code: 'STATUS_CHECK_ERROR'
    }, { status: 500 });
  }
}
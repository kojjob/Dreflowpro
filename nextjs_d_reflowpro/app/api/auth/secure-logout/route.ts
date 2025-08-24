import { NextRequest, NextResponse } from 'next/server';
import SecureStorage from '../../../utils/secureStorage';
import Logger from '../../../utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Get current tokens for backend logout call
    const tokens = await SecureStorage.getTokensSecure();

    // Clear secure cookies immediately
    await SecureStorage.clearTokensSecure();

    // Optionally call backend logout endpoint
    if (tokens?.access_token) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        
        await fetch(`${backendUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (backendError) {
        // Backend logout failed, but we still cleared client tokens
        Logger.warn('Backend logout failed:', backendError);
      }
    }

    Logger.log('User logout successful - secure cookies cleared');

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    Logger.error('Secure logout error:', error);
    
    // Even if there's an error, try to clear cookies
    try {
      await SecureStorage.clearTokensSecure();
    } catch (clearError) {
      Logger.error('Failed to clear tokens during error handling:', clearError);
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error during logout, but cookies cleared' 
      },
      { status: 500 }
    );
  }
}
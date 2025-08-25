import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import SecureStorage from '../../../utils/secureStorage';
import Logger from '../../../utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    // Make API call to backend authentication endpoint
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
      Logger.warn('Backend authentication failed:', errorData);
      
      return NextResponse.json(
        { 
          success: false,
          error: errorData.detail || 'Authentication failed' 
        },
        { status: response.status }
      );
    }

    const tokens = await response.json();

    // Store tokens securely in httpOnly cookies
    await SecureStorage.storeTokensSecure({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type || 'bearer',
      expires_in: tokens.expires_in || 3600
    });

    Logger.log('User authentication successful - tokens stored securely');

    // Return success response without tokens (they're in httpOnly cookies)
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: tokens.user || null
    });

  } catch (error) {
    Logger.error('Secure login error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during authentication' 
      },
      { status: 500 }
    );
  }
}
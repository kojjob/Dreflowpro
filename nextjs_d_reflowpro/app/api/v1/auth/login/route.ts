import { NextRequest, NextResponse } from 'next/server';

// Mock user data
const mockUsers = [
  {
    id: 'user_123',
    email: 'admin@dreflowpro.com',
    password: 'mock_admin_password', // In real app, this would be hashed
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    permissions: ['read', 'write', 'admin'],
    last_login: null,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user_456',
    email: 'demo@dreflowpro.com',
    password: 'mock_demo_password',
    name: 'Demo User',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    permissions: ['read', 'write'],
    last_login: null,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // Find user
    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Check password (in real app, compare hashed passwords)
    if (user.password !== password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Update last login
    user.last_login = new Date().toISOString();

    // Generate mock JWT token (in real app, use proper JWT library)
    const token = `mock_jwt_token_${user.id}_${Date.now()}`;

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer'
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
        message: 'An error occurred during login'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

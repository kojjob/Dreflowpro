import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Transform backend response to match frontend User interface
    const transformedUser = {
      id: data.id,
      email: data.email,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
      avatar: data.avatar_url,
      role: {
        id: data.role || 'user',
        name: data.role === 'admin' ? 'Admin' : 'User',
        permissions: data.role === 'admin' ? ['all'] : ['read'],
        color: data.role === 'admin' ? 'red' : 'blue'
      },
      subscription: {
        id: 'default',
        name: 'Free',
        tier: 'free',
        features: ['basic'],
        limits: {
          pipelines: 5,
          dataProcessing: 1,
          apiCalls: 1000,
          users: 1
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
          push: false,
          desktop: false,
          pipelineUpdates: true,
          systemAlerts: true,
          weeklyReports: false
        },
        dashboard: {
          defaultView: 'overview',
          refreshInterval: 30,
          showWelcome: true
        }
      },
      createdAt: data.created_at,
      lastLoginAt: data.last_login,
      isEmailVerified: data.email_verified || false,
      isActive: data.is_active || true
    }

    return NextResponse.json(transformedUser)
  } catch (error) {
    console.error('Me API error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
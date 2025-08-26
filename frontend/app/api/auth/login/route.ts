import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Login API error:', error)

    // Provide more specific error messages based on the error type
    let errorMessage = 'Internal server error'
    let errorDetail = 'An unexpected error occurred during login'

    if (error?.cause?.code === 'ECONNREFUSED') {
      errorMessage = 'Backend service unavailable'
      errorDetail = 'Unable to connect to the authentication service. Please ensure the backend server is running or try again later.'
    } else if (error?.name === 'TypeError' && error?.message?.includes('fetch failed')) {
      errorMessage = 'Network connection failed'
      errorDetail = 'Failed to connect to the authentication service. Please check your network connection and try again.'
    } else if (error?.message) {
      errorDetail = error.message
    }

    return NextResponse.json(
      {
        detail: errorMessage,
        message: errorDetail,
        error: 'BACKEND_CONNECTION_ERROR'
      },
      { status: 503 } // Service Unavailable instead of 500
    )
  }
}
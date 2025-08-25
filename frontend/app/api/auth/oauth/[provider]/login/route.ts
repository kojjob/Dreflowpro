import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params

    // Validate provider
    if (!['google', 'github', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { detail: 'Invalid OAuth provider' },
        { status: 400 }
      )
    }

    // Redirect to FastAPI OAuth endpoint
    const oauthUrl = `${API_BASE_URL}/api/v1/auth/oauth/${provider}/login`
    
    return NextResponse.redirect(oauthUrl)
  } catch (error) {
    console.error('OAuth login error:', error)
    return NextResponse.json(
      { detail: 'OAuth authentication failed' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy - Strict policy for production security
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Base CSP for production
  let csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js development
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.github.com https://api.microsoft.com https://oauth2.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests"
  ];

  // Relax CSP for development
  if (isDevelopment) {
    csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* ws: wss:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' localhost:* ws: wss: https://api.github.com https://api.microsoft.com https://oauth2.googleapis.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ];
  }

  // Set Content Security Policy
  response.headers.set('Content-Security-Policy', csp.join('; '));
  
  // Additional Security Headers
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filtering and block page if attack detected
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent page from being displayed in a frame (clickjacking protection)
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Force HTTPS in production
  if (!isDevelopment) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  // Prevent referrer information leakage
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Control which features and APIs can be used
  response.headers.set('Permissions-Policy', [
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=()',
    'document-domain=(), encrypted-media=(), fullscreen=(), gyroscope=()',
    'magnetometer=(), payment=(), picture-in-picture=(), publickey-credentials-get=(),',
    'sync-xhr=(), usb=(), wake-lock=(), xr-spatial-tracking=()'
  ].join(' '));
  
  // Prevent DNS prefetching for privacy
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  
  // Disable client-side caching of sensitive pages
  if (request.nextUrl.pathname.includes('/auth') || request.nextUrl.pathname.includes('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  // Add security headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Prevent API responses from being cached
    response.headers.set('Cache-Control', 'no-store');
    
    // Add API-specific security headers
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    
    // CORS headers for API (restrictive by default)
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      'https://yourdomain.com' // Add your production domain
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
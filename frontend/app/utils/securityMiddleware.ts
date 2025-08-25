/**
 * Security middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeInput, sanitizeJson, ClientRateLimiter } from './sanitization';
import Logger from './logger';

interface SecurityConfig {
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;
  enableInputSanitization?: boolean;
  enableCsrfProtection?: boolean;
  enableCors?: boolean;
  allowedOrigins?: string[];
  maxRequestSize?: number;
}

const defaultConfig: SecurityConfig = {
  enableRateLimit: true,
  maxRequestsPerMinute: 60,
  enableInputSanitization: true,
  enableCsrfProtection: true,
  enableCors: true,
  allowedOrigins: [
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
    'https://*.dreflowpro.com'
  ],
  maxRequestSize: 10 * 1024 * 1024, // 10MB
};

class SecurityMiddleware {
  private rateLimiter: ClientRateLimiter;
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = { ...defaultConfig, ...config };
    this.rateLimiter = new ClientRateLimiter(
      this.config.maxRequestsPerMinute || 60,
      60000 // 1 minute window
    );
  }

  /**
   * Main middleware function
   */
  async handle(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Security checks
      await this.performSecurityChecks(request);

      // Apply security headers
      const response = await handler(request);
      return this.addSecurityHeaders(response);
    } catch (error) {
      Logger.error('Security middleware error:', error);
      
      if (error instanceof SecurityError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        { error: 'Security check failed' },
        { status: 403 }
      );
    }
  }

  /**
   * Perform various security checks
   */
  private async performSecurityChecks(request: NextRequest): Promise<void> {
    // Rate limiting
    if (this.config.enableRateLimit) {
      await this.checkRateLimit(request);
    }

    // Request size check
    await this.checkRequestSize(request);

    // CORS check
    if (this.config.enableCors) {
      await this.checkCors(request);
    }

    // Input sanitization
    if (this.config.enableInputSanitization) {
      await this.sanitizeRequest(request);
    }

    // CSRF protection
    if (this.config.enableCsrfProtection) {
      await this.checkCsrf(request);
    }

    // Additional security checks
    await this.checkSuspiciousPatterns(request);
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(request: NextRequest): Promise<void> {
    const clientId = this.getClientId(request);
    
    if (!this.rateLimiter.isAllowed(clientId)) {
      Logger.warn(`Rate limit exceeded for client: ${clientId}`);
      throw new SecurityError('Rate limit exceeded', 429);
    }
  }

  /**
   * Check request size
   */
  private async checkRequestSize(request: NextRequest): Promise<void> {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (size > (this.config.maxRequestSize || 0)) {
        throw new SecurityError('Request too large', 413);
      }
    }
  }

  /**
   * CORS check
   */
  private async checkCors(request: NextRequest): Promise<void> {
    const origin = request.headers.get('origin');
    
    if (origin && !this.isOriginAllowed(origin)) {
      Logger.warn(`CORS violation from origin: ${origin}`);
      throw new SecurityError('CORS policy violation', 403);
    }
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    const allowedOrigins = this.config.allowedOrigins || [];
    
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        // Simple wildcard matching
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
  }

  /**
   * Input sanitization
   */
  private async sanitizeRequest(request: NextRequest): Promise<void> {
    // Sanitize URL parameters
    const url = new URL(request.url);
    for (const [key, value] of url.searchParams.entries()) {
      const sanitizedValue = sanitizeInput(value);
      if (sanitizedValue !== value) {
        Logger.info(`Sanitized URL parameter ${key}: ${value} -> ${sanitizedValue}`);
      }
    }

    // Sanitize request body (for POST/PUT/PATCH requests)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          const body = await request.text();
          const sanitized = sanitizeJson(body);
          if (!sanitized) {
            throw new SecurityError('Invalid request body', 400);
          }
        }
      } catch (error) {
        if (error instanceof SecurityError) {
          throw error;
        }
        Logger.warn('Failed to sanitize request body:', error);
      }
    }
  }

  /**
   * CSRF protection check
   */
  private async checkCsrf(request: NextRequest): Promise<void> {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token');
      const referer = request.headers.get('referer');
      const origin = request.headers.get('origin');

      // Check for CSRF token in state-changing requests
      if (!csrfToken) {
        // For now, we'll check referer/origin as a basic CSRF protection
        const requestOrigin = origin || (referer ? new URL(referer).origin : null);
        
        if (!requestOrigin || !this.isOriginAllowed(requestOrigin)) {
          Logger.warn(`Potential CSRF attack detected. Origin: ${requestOrigin}`);
          throw new SecurityError('CSRF token required', 403);
        }
      }
    }
  }

  /**
   * Check for suspicious patterns in the request
   */
  private async checkSuspiciousPatterns(request: NextRequest): Promise<void> {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      // Path traversal
      /\.\.\//g,
      // Command injection
      /[;&|`$\(\)]/g
    ];

    const url = request.url;
    const userAgent = request.headers.get('user-agent') || '';

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        Logger.warn(`Suspicious pattern detected in request: ${url}`);
        throw new SecurityError('Suspicious request pattern detected', 400);
      }
    }
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(response: NextResponse): NextResponse {
    const headers = {
      // Prevent XSS attacks
      'X-XSS-Protection': '1; mode=block',
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join('; '),
      // HSTS for HTTPS
      ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      }),
      // CORS headers if enabled
      ...(this.config.enableCors && {
        'Access-Control-Allow-Origin': this.getAllowedOriginsHeader(),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
        'Access-Control-Max-Age': '86400'
      })
    };

    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        response.headers.set(key, value);
      }
    });

    return response;
  }

  /**
   * Get allowed origins header value
   */
  private getAllowedOriginsHeader(): string {
    const origins = this.config.allowedOrigins || [];
    return origins.length === 1 ? origins[0] : '*';
  }

  /**
   * Get client ID for rate limiting
   */
  private getClientId(request: NextRequest): string {
    // Use IP address and User-Agent as client identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return `${ip}-${userAgent.slice(0, 50)}`; // Truncate user agent
  }
}

/**
 * Custom error class for security violations
 */
class SecurityError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Create security middleware with custom config
 */
export function createSecurityMiddleware(config?: SecurityConfig) {
  const middleware = new SecurityMiddleware(config);
  
  return async (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return middleware.handle(request, handler);
  };
}

/**
 * Default security middleware instance
 */
export const securityMiddleware = createSecurityMiddleware();

/**
 * Convenience wrapper for API route handlers
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  config?: SecurityConfig
) {
  const middleware = createSecurityMiddleware(config);
  
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    return middleware.handle(request, () => handler(request, ...args));
  };
}
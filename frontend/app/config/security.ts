/**
 * Security configuration for DReflowPro
 */

export const SECURITY_CONFIG = {
  // Content Security Policy
  CSP: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for Next.js in development
        "https://cdn.jsdelivr.net", // For external libraries
        process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""
      ].filter(Boolean),
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Needed for Tailwind and component styles
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:" // For dynamically generated images
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
        "wss:", // WebSocket connections
        "https://api.github.com", // GitHub OAuth
        "https://accounts.google.com", // Google OAuth
        "https://login.microsoftonline.com" // Microsoft OAuth
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: [
        "'self'",
        "https://accounts.google.com", // Google OAuth iframes
        "https://login.microsoftonline.com" // Microsoft OAuth iframes
      ],
      childSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },

  // CORS configuration
  CORS: {
    allowedOrigins: [
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      // Production domains
      "https://dreflowpro.com",
      "https://app.dreflowpro.com",
      "https://api.dreflowpro.com"
    ],
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Requested-With",
      "Accept",
      "Accept-Version",
      "Content-Length",
      "Content-MD5",
      "Date",
      "X-Api-Version"
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Rate limiting configuration
  RATE_LIMIT: {
    // General API requests
    general: {
      windowMs: 60000, // 1 minute
      max: 60, // requests per window
      message: "Too many requests, please try again later."
    },
    // Authentication endpoints
    auth: {
      windowMs: 900000, // 15 minutes
      max: 5, // requests per window
      message: "Too many authentication attempts, please try again later."
    },
    // File upload endpoints
    upload: {
      windowMs: 60000, // 1 minute
      max: 10, // requests per window
      message: "Too many upload requests, please try again later."
    },
    // Email sending
    email: {
      windowMs: 3600000, // 1 hour
      max: 10, // requests per window
      message: "Too many email requests, please try again later."
    }
  },

  // Input validation rules
  VALIDATION: {
    maxInputLength: 1000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/json',
      'text/plain',
      'text/tab-separated-values'
    ],
    email: {
      maxLength: 254,
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    },
    password: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    },
    name: {
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/
    },
    url: {
      maxLength: 2048,
      allowedProtocols: ['http:', 'https:']
    }
  },

  // Session security
  SESSION: {
    name: 'dreflowpro-session',
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const
  },

  // JWT configuration
  JWT: {
    secret: process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production',
    algorithm: 'HS256' as const,
    expiresIn: '1h',
    refreshExpiresIn: '7d',
    issuer: 'dreflowpro',
    audience: 'dreflowpro-users'
  },

  // CSRF protection
  CSRF: {
    enabled: true,
    cookieName: 'dreflowpro-csrf',
    headerName: 'x-csrf-token',
    methods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Security headers
  SECURITY_HEADERS: {
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    })
  },

  // Dangerous patterns to block
  BLOCKED_PATTERNS: [
    // SQL injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    // XSS
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers
    // Path traversal
    /\.\.\//g,
    /\.\.\\\/g,
    // Command injection
    /[;&|`$\(\)\{\}]/g,
    // LDAP injection
    /[()&|!]/g
  ],

  // Allowed HTML tags and attributes (if HTML is allowed in specific contexts)
  ALLOWED_HTML: {
    tags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    attributes: {
      'a': ['href', 'title'],
      '*': ['class'] // Allow class attribute on all allowed tags
    }
  },

  // Error messages (generic to avoid information leakage)
  ERROR_MESSAGES: {
    GENERIC: 'An error occurred. Please try again.',
    VALIDATION: 'Invalid input provided.',
    AUTHENTICATION: 'Authentication failed.',
    AUTHORIZATION: 'Access denied.',
    RATE_LIMIT: 'Too many requests. Please try again later.',
    CSRF: 'Security token validation failed.',
    FILE_UPLOAD: 'File upload failed or invalid file type.',
    SERVER_ERROR: 'Server error occurred. Please contact support if the problem persists.'
  }
} as const;

// Type exports for TypeScript
export type SecurityConfig = typeof SECURITY_CONFIG;
export type SecurityHeaders = typeof SECURITY_CONFIG.SECURITY_HEADERS;
export type ValidationRules = typeof SECURITY_CONFIG.VALIDATION;
export type RateLimitConfig = typeof SECURITY_CONFIG.RATE_LIMIT;
/**
 * Input sanitization and XSS protection utilities
 */

// HTML escape map for XSS prevention
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escapes HTML characters to prevent XSS attacks
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input.replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Sanitizes user input by removing dangerous characters and patterns
 */
export function sanitizeInput(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
} = {}): string {
  const { allowHtml = false, maxLength, trimWhitespace = true } = options;
  
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  // Trim whitespace if requested
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }
  
  // Truncate if max length specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]/g, '') // Allow only valid email characters
    .substring(0, 254); // RFC 5321 limit
}

/**
 * Sanitizes URL input to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];
  
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Allow only http, https, mailto, tel protocols or relative URLs
  const allowedProtocolPattern = /^(https?:|mailto:|tel:|\/|#)/i;
  
  if (trimmed && !allowedProtocolPattern.test(trimmed)) {
    return '';
  }
  
  return url.trim();
}

/**
 * Sanitizes filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return '';
  }
  
  return filename
    .trim()
    .replace(/[^a-z0-9._-]/gi, '_') // Replace invalid characters with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .substring(0, 255); // Limit length
}

/**
 * Validates and sanitizes JSON input
 */
export function sanitizeJson(input: string): object | null {
  if (typeof input !== 'string') {
    return null;
  }
  
  try {
    // Remove any potential XSS in the JSON string
    const sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return JSON.parse(sanitized);
  } catch {
    return null;
  }
}

/**
 * Sanitizes search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  return query
    .trim()
    .replace(/[<>\"']/g, '') // Remove HTML and quote characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 200); // Limit length
}

/**
 * Sanitizes SQL-like input to prevent basic injection attempts
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(--|\*\/|\/\*)/g, // SQL comments
    /(;|\||&)/g, // Command separators
    /('|('')|"|("")|`)/g // Quotes
  ];
  
  let sanitized = input.trim();
  
  for (const pattern of sqlPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized;
}

/**
 * Content Security Policy (CSP) nonce generator
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof global !== 'undefined' && global.crypto) {
    global.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Buffer.from(array).toString('base64');
}

/**
 * Rate limiting helper for client-side
 */
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Validation helpers
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  strongPassword: (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },
  
  phoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
};
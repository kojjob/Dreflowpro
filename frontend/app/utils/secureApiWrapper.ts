/**
 * Secure API wrapper with request sanitization and security headers
 */

import { sanitizeInput, sanitizeJson, generateNonce, ClientRateLimiter } from './sanitization';
import Logger from './logger';

interface SecureRequestOptions extends RequestInit {
  sanitize?: boolean;
  validateResponse?: boolean;
  timeout?: number;
  retryCount?: number;
  rateLimit?: boolean;
}

interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Strict-Transport-Security'?: string;
}

class SecureApiWrapper {
  private rateLimiter: ClientRateLimiter;
  private defaultTimeout = 30000; // 30 seconds
  private maxRetries = 3;

  constructor() {
    this.rateLimiter = new ClientRateLimiter(100, 60000); // 100 requests per minute
  }

  /**
   * Secure fetch with sanitization and security measures
   */
  async secureFetch(
    url: string,
    options: SecureRequestOptions = {}
  ): Promise<Response> {
    const {
      sanitize = true,
      validateResponse = true,
      timeout = this.defaultTimeout,
      retryCount = 0,
      rateLimit = true,
      ...fetchOptions
    } = options;

    // Rate limiting check
    if (rateLimit && !this.rateLimiter.isAllowed(this.getRequestKey(url))) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    // Sanitize request body if present
    if (sanitize && fetchOptions.body) {
      fetchOptions.body = this.sanitizeRequestBody(fetchOptions.body);
    }

    // Add security headers
    fetchOptions.headers = {
      ...this.getSecurityHeaders(),
      ...fetchOptions.headers,
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Validate response if requested
      if (validateResponse) {
        await this.validateResponse(response.clone());
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: The server took too long to respond.');
        }
        
        // Retry logic for network errors
        if (this.shouldRetry(error, retryCount)) {
          Logger.warn(`Request failed, retrying (${retryCount + 1}/${this.maxRetries}):`, error.message);
          return this.secureFetch(url, {
            ...options,
            retryCount: retryCount + 1,
          });
        }
      }

      throw error;
    }
  }

  /**
   * Sanitize request body based on content type
   */
  private sanitizeRequestBody(body: BodyInit): BodyInit {
    if (typeof body === 'string') {
      try {
        // Try to parse as JSON and sanitize
        const parsed = JSON.parse(body);
        const sanitized = this.sanitizeObject(parsed);
        return JSON.stringify(sanitized);
      } catch {
        // If not JSON, sanitize as text
        return sanitizeInput(body, { allowHtml: false });
      }
    }

    if (body instanceof FormData) {
      const sanitizedFormData = new FormData();
      body.forEach((value, key) => {
        const sanitizedKey = sanitizeInput(key, { allowHtml: false });
        const sanitizedValue = typeof value === 'string' 
          ? sanitizeInput(value, { allowHtml: false })
          : value;
        sanitizedFormData.append(sanitizedKey, sanitizedValue);
      });
      return sanitizedFormData;
    }

    // Return as-is for other body types (ArrayBuffer, Blob, etc.)
    return body;
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeInput(key, { allowHtml: false });
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return sanitizeInput(obj, { allowHtml: false });
    }

    return obj;
  }

  /**
   * Get security headers for requests
   */
  private getSecurityHeaders(): SecurityHeaders {
    const nonce = generateNonce();
    
    return {
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';`,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  /**
   * Validate response for security issues
   */
  private async validateResponse(response: Response): Promise<void> {
    // Check for suspicious content types
    const contentType = response.headers.get('content-type');
    if (contentType) {
      const dangerousTypes = ['text/html', 'application/javascript'];
      if (dangerousTypes.some(type => contentType.includes(type))) {
        Logger.warn('Potentially dangerous content type received:', contentType);
      }
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
    suspiciousHeaders.forEach(header => {
      if (response.headers.has(header)) {
        Logger.warn('Suspicious header detected:', header);
      }
    });

    // Validate JSON responses
    if (contentType?.includes('application/json')) {
      try {
        const text = await response.text();
        const sanitized = sanitizeJson(text);
        if (!sanitized) {
          throw new Error('Invalid or potentially malicious JSON response');
        }
      } catch (error) {
        Logger.error('Response validation failed:', error);
        throw new Error('Response validation failed');
      }
    }
  }

  /**
   * Generate request key for rate limiting
   */
  private getRequestKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: Error, retryCount: number): boolean {
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors, not on client errors
    const retryableErrors = [
      'fetch failed',
      'network error',
      'timeout',
      'connection refused'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(msg => errorMessage.includes(msg));
  }

  /**
   * Clear rate limiter cache (for testing or reset purposes)
   */
  clearRateLimit(): void {
    this.rateLimiter.clear();
  }
}

// Export singleton instance
export const secureApiWrapper = new SecureApiWrapper();

// Helper functions for common secure API operations
export async function secureGet(url: string, options: Omit<SecureRequestOptions, 'method'> = {}): Promise<Response> {
  return secureApiWrapper.secureFetch(url, { ...options, method: 'GET' });
}

export async function securePost(url: string, data: any, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
  return secureApiWrapper.secureFetch(url, {
    ...options,
    method: 'POST',
    body: typeof data === 'object' ? JSON.stringify(data) : data,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function securePut(url: string, data: any, options: Omit<SecureRequestOptions, 'method' | 'body'> = {}): Promise<Response> {
  return secureApiWrapper.secureFetch(url, {
    ...options,
    method: 'PUT',
    body: typeof data === 'object' ? JSON.stringify(data) : data,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function secureDelete(url: string, options: Omit<SecureRequestOptions, 'method'> = {}): Promise<Response> {
  return secureApiWrapper.secureFetch(url, { ...options, method: 'DELETE' });
}

export { SecureApiWrapper };
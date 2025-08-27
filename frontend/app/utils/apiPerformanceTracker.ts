/**
 * API Performance Tracking and Request Deduplication System
 */

import { trackAPICall, trackCacheHit } from './performanceMetrics';

interface RequestOptions extends RequestInit {
  dedupe?: boolean;
  timeout?: number;
  retries?: number;
  cacheKey?: string;
}

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

interface CachedResponse {
  response: Response;
  timestamp: number;
  ttl: number;
}

export class APIPerformanceTracker {
  private static instance: APIPerformanceTracker;
  private pendingRequests = new Map<string, PendingRequest>();
  private responseCache = new Map<string, CachedResponse>();
  private requestMetrics = new Map<string, number[]>();

  static getInstance(): APIPerformanceTracker {
    if (!APIPerformanceTracker.instance) {
      APIPerformanceTracker.instance = new APIPerformanceTracker();
    }
    return APIPerformanceTracker.instance;
  }

  private constructor() {
    // Cleanup expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);
  }

  /**
   * Enhanced fetch with performance tracking and deduplication
   */
  async fetch(url: string, options: RequestOptions = {}): Promise<Response> {
    const startTime = performance.now();
    const method = options.method || 'GET';
    const requestKey = this.generateRequestKey(url, method, options.body);

    try {
      // Handle caching for GET requests
      if (method === 'GET' && options.cacheKey) {
        const cachedResponse = this.getCachedResponse(options.cacheKey);
        if (cachedResponse) {
          trackCacheHit(true);
          this.recordMetric(url, performance.now() - startTime);
          return cachedResponse.clone();
        }
        trackCacheHit(false);
      }

      // Handle request deduplication
      if (options.dedupe !== false) {
        const pendingRequest = this.pendingRequests.get(requestKey);
        if (pendingRequest) {
          console.log(`🔄 Deduplicating request to ${url}`);
          const response = await pendingRequest.promise;
          this.recordMetric(url, performance.now() - startTime);
          return response.clone();
        }
      }

      // Create the request promise
      const requestPromise = this.executeRequest(url, options);
      
      // Store pending request for deduplication
      if (options.dedupe !== false) {
        this.pendingRequests.set(requestKey, {
          promise: requestPromise,
          timestamp: Date.now(),
        });
      }

      const response = await requestPromise;
      const duration = performance.now() - startTime;
      
      // Record metrics
      this.recordMetric(url, duration);
      trackAPICall(url, duration, response.ok);

      // Cache GET responses if cacheKey provided
      if (method === 'GET' && options.cacheKey && response.ok) {
        this.cacheResponse(options.cacheKey, response.clone(), 5 * 60 * 1000); // 5 minutes default TTL
      }

      // Cleanup pending request
      this.pendingRequests.delete(requestKey);

      return response;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(url, duration);
      trackAPICall(url, duration, false);
      this.pendingRequests.delete(requestKey);
      throw error;
    }
  }

  /**
   * Execute the actual request with timeout and retry logic
   */
  private async executeRequest(url: string, options: RequestOptions): Promise<Response> {
    const { timeout = 10000, retries = 0, ...fetchOptions } = options;

    const executeWithTimeout = async (attempt = 0): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Retry on server errors (5xx)
        if (!response.ok && response.status >= 500 && attempt < retries) {
          console.warn(`🔄 Retrying request to ${url} (attempt ${attempt + 1}/${retries})`);
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          return executeWithTimeout(attempt + 1);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        // Retry on network errors
        if (attempt < retries && this.isRetryableError(error)) {
          console.warn(`🔄 Retrying request to ${url} after error (attempt ${attempt + 1}/${retries}):`, error);
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          return executeWithTimeout(attempt + 1);
        }

        throw error;
      }
    };

    return executeWithTimeout();
  }

  /**
   * Record performance metric for endpoint
   */
  private recordMetric(url: string, duration: number) {
    const endpoint = this.extractEndpoint(url);
    const metrics = this.requestMetrics.get(endpoint) || [];
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    this.requestMetrics.set(endpoint, metrics);
  }

  /**
   * Get performance statistics for an endpoint
   */
  getEndpointStats(endpoint: string) {
    const metrics = this.requestMetrics.get(endpoint);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const avg = metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
    
    return {
      count: metrics.length,
      average: avg,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: Math.min(...metrics),
      max: Math.max(...metrics),
    };
  }

  /**
   * Get all endpoint statistics
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [endpoint, metrics] of this.requestMetrics.entries()) {
      stats[endpoint] = this.getEndpointStats(endpoint);
    }
    return stats;
  }

  /**
   * Clear all cached responses
   */
  clearCache() {
    this.responseCache.clear();
    console.log('🗑️ API response cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(this.responseCache.values()).filter(
      entry => now - entry.timestamp < entry.ttl
    );

    return {
      totalEntries: this.responseCache.size,
      validEntries: validEntries.length,
      hitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Private utility methods
   */
  private generateRequestKey(url: string, method: string, body?: any): string {
    const bodyHash = body ? this.simpleHash(JSON.stringify(body)) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  private getCachedResponse(cacheKey: string): Response | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  private cacheResponse(cacheKey: string, response: Response, ttl: number) {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.responseCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.responseCache.delete(key);
      }
    }

    // Also cleanup old pending requests (older than 30 seconds)
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }
  }

  private calculateCacheHitRate(): number {
    // This would be implemented with proper hit/miss tracking
    // For now, return a placeholder
    return 0.75; // 75% hit rate placeholder
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/\/\d+/g, '/:id'); // Replace numeric IDs with :id
    } catch {
      return url;
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and some HTTP errors
    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('fetch') ||
      error.message.includes('network')
    );
  }
}

// Export singleton instance and convenient wrapper functions
export const apiTracker = APIPerformanceTracker.getInstance();

/**
 * Enhanced fetch wrapper with performance tracking and deduplication
 */
export const trackedFetch = (url: string, options: RequestOptions = {}) => {
  return apiTracker.fetch(url, options);
};

/**
 * GET request with caching
 */
export const cachedGet = (url: string, cacheKey?: string, cacheTTL?: number) => {
  return trackedFetch(url, {
    method: 'GET',
    cacheKey: cacheKey || url,
    dedupe: true,
  });
};

/**
 * POST request with deduplication protection
 */
export const deduplicatedPost = (url: string, body: any, options: RequestOptions = {}) => {
  return trackedFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    dedupe: true,
  });
};

/**
 * Reliable request with retries
 */
export const reliableRequest = (url: string, options: RequestOptions = {}) => {
  return trackedFetch(url, {
    ...options,
    retries: 3,
    timeout: 15000,
  });
};

export default apiTracker;
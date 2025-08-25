/**
 * Advanced caching strategies for improved performance
 */

// Cache configuration
export const CACHE_CONFIG = {
  // Cache duration in milliseconds
  TTL: {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 30 * 60 * 1000,    // 30 minutes
    LONG: 2 * 60 * 60 * 1000,  // 2 hours
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Cache size limits
  MAX_ENTRIES: {
    MEMORY: 100,
    SESSION: 50,
    LOCAL: 200,
  },
  
  // Cache prefixes for different data types
  PREFIXES: {
    API: 'api_',
    USER: 'user_',
    ANALYTICS: 'analytics_',
    DASHBOARD: 'dashboard_',
    REPORTS: 'reports_',
  },
} as const;

export type CacheTTL = keyof typeof CACHE_CONFIG.TTL;
export type CachePrefix = keyof typeof CACHE_CONFIG.PREFIXES;

/**
 * Interface for cached items
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Memory cache for temporary data storage
 */
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxEntries: number;

  constructor(maxEntries: number = CACHE_CONFIG.MAX_ENTRIES.MEMORY) {
    this.maxEntries = maxEntries;
  }

  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.MEDIUM): void {
    // Clean expired entries before adding new ones
    this.cleanup();

    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, item);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();

    return item.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Remove least recently used entries
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Get cache statistics
  getStats() {
    this.cleanup();
    
    let totalAccesses = 0;
    const entries = Array.from(this.cache.values());
    
    entries.forEach(item => {
      totalAccesses += item.accessCount;
    });

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      totalAccesses,
      averageAccesses: entries.length ? totalAccesses / entries.length : 0,
      usage: (this.cache.size / this.maxEntries) * 100,
    };
  }
}

/**
 * Persistent storage cache (localStorage/sessionStorage)
 */
class PersistentCache {
  private storage: Storage;
  private prefix: string;

  constructor(storage: Storage, prefix: string = 'cache_') {
    this.storage = storage;
    this.prefix = prefix;
  }

  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.LONG): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      this.storage.setItem(
        this.prefix + key,
        JSON.stringify(item)
      );
    } catch (error) {
      // Handle quota exceeded error
      console.warn('Cache storage quota exceeded:', error);
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    try {
      const itemStr = this.storage.getItem(this.prefix + key);
      
      if (!itemStr) {
        return null;
      }

      const item: CacheItem<T> = JSON.parse(itemStr);

      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.storage.removeItem(this.prefix + key);
        return null;
      }

      // Update access statistics
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.storage.setItem(this.prefix + key, JSON.stringify(item));

      return item.data;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    try {
      this.storage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error);
      return false;
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(this.storage).filter(key => 
        key.startsWith(this.prefix)
      );
      
      keys.forEach(key => this.storage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  // Clean up expired entries
  cleanup(): void {
    try {
      const keys = Object.keys(this.storage).filter(key => 
        key.startsWith(this.prefix)
      );
      
      const now = Date.now();
      
      keys.forEach(key => {
        try {
          const itemStr = this.storage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (now - item.timestamp > item.ttl) {
              this.storage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted entries
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }
}

/**
 * Multi-level cache manager
 */
class CacheManager {
  private memoryCache: MemoryCache;
  private sessionCache: PersistentCache;
  private localCache: PersistentCache;

  constructor() {
    this.memoryCache = new MemoryCache();
    
    if (typeof window !== 'undefined') {
      this.sessionCache = new PersistentCache(sessionStorage, 'session_cache_');
      this.localCache = new PersistentCache(localStorage, 'local_cache_');
      
      // Cleanup on initialization
      this.sessionCache.cleanup();
      this.localCache.cleanup();
    }
  }

  /**
   * Set data in appropriate cache level
   */
  set<T>(key: string, data: T, options: {
    level?: 'memory' | 'session' | 'local';
    ttl?: number;
    prefix?: CachePrefix;
  } = {}): void {
    const {
      level = 'memory',
      ttl = CACHE_CONFIG.TTL.MEDIUM,
      prefix,
    } = options;

    const cacheKey = prefix ? CACHE_CONFIG.PREFIXES[prefix] + key : key;

    switch (level) {
      case 'memory':
        this.memoryCache.set(cacheKey, data, ttl);
        break;
      case 'session':
        if (this.sessionCache) {
          this.sessionCache.set(cacheKey, data, ttl);
        }
        break;
      case 'local':
        if (this.localCache) {
          this.localCache.set(cacheKey, data, ttl);
        }
        break;
    }
  }

  /**
   * Get data from cache (checks all levels)
   */
  get<T>(key: string, options: {
    level?: 'memory' | 'session' | 'local' | 'all';
    prefix?: CachePrefix;
  } = {}): T | null {
    const {
      level = 'all',
      prefix,
    } = options;

    const cacheKey = prefix ? CACHE_CONFIG.PREFIXES[prefix] + key : key;

    if (level === 'all') {
      // Check memory cache first (fastest)
      let data = this.memoryCache.get<T>(cacheKey);
      if (data !== null) return data;

      // Check session cache
      if (this.sessionCache) {
        data = this.sessionCache.get<T>(cacheKey);
        if (data !== null) {
          // Promote to memory cache
          this.memoryCache.set(cacheKey, data, CACHE_CONFIG.TTL.SHORT);
          return data;
        }
      }

      // Check local cache
      if (this.localCache) {
        data = this.localCache.get<T>(cacheKey);
        if (data !== null) {
          // Promote to memory cache
          this.memoryCache.set(cacheKey, data, CACHE_CONFIG.TTL.SHORT);
          return data;
        }
      }

      return null;
    }

    // Check specific level
    switch (level) {
      case 'memory':
        return this.memoryCache.get<T>(cacheKey);
      case 'session':
        return this.sessionCache?.get<T>(cacheKey) || null;
      case 'local':
        return this.localCache?.get<T>(cacheKey) || null;
      default:
        return null;
    }
  }

  /**
   * Remove from all cache levels
   */
  delete(key: string, prefix?: CachePrefix): void {
    const cacheKey = prefix ? CACHE_CONFIG.PREFIXES[prefix] + key : key;
    
    this.memoryCache.delete(cacheKey);
    this.sessionCache?.delete(cacheKey);
    this.localCache?.delete(cacheKey);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.memoryCache.clear();
    this.sessionCache?.clear();
    this.localCache?.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      session: this.sessionCache ? 'available' : 'unavailable',
      local: this.localCache ? 'available' : 'unavailable',
    };
  }
}

/**
 * Singleton cache manager instance
 */
export const cacheManager = new CacheManager();

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    key?: (...args: Parameters<T>) => string;
    ttl?: number;
    level?: 'memory' | 'session' | 'local';
    prefix?: CachePrefix;
  } = {}
): T {
  const {
    key = (...args) => JSON.stringify(args),
    ttl = CACHE_CONFIG.TTL.MEDIUM,
    level = 'memory',
    prefix,
  } = options;

  return ((...args: Parameters<T>) => {
    const cacheKey = key(...args);
    
    // Try to get from cache
    const cached = cacheManager.get(cacheKey, { level, prefix });
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = fn(...args);
    cacheManager.set(cacheKey, result, { ttl, level, prefix });
    
    return result;
  }) as T;
}

/**
 * React hook for cached API calls
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    level?: 'memory' | 'session' | 'local';
    prefix?: CachePrefix;
    refreshInterval?: number;
  } = {}
) {
  const {
    ttl = CACHE_CONFIG.TTL.MEDIUM,
    level = 'memory',
    prefix,
    refreshInterval,
  } = options;

  const [data, setData] = React.useState<T | null>(
    () => cacheManager.get<T>(key, { level, prefix })
  );
  const [loading, setLoading] = React.useState(!data);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcher();
      
      // Cache the result
      cacheManager.set(key, result, { ttl, level, prefix });
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, key, ttl, level, prefix]);

  // Initial load
  React.useEffect(() => {
    if (!data) {
      fetchData();
    }
  }, [data, fetchData]);

  // Refresh interval
  React.useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  const refresh = React.useCallback(() => {
    cacheManager.delete(key, prefix);
    fetchData();
  }, [key, prefix, fetchData]);

  return { data, loading, error, refresh };
}

// React import for hooks
import React from 'react';

export default cacheManager;
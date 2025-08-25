'use client';

import { useCallback, useRef, useEffect } from 'react';
import { trackedFetch, cachedGet, deduplicatedPost, reliableRequest, apiTracker } from '../utils/apiPerformanceTracker';

interface UseApiOptions {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  retries?: number;
  timeout?: number;
  cacheTTL?: number;
}

/**
 * Hook for making API calls with performance tracking
 */
export function useApiPerformance(baseUrl?: string, defaultOptions: UseApiOptions = {}) {
  const requestsRef = useRef(new Map<string, AbortController>());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all pending requests
      requestsRef.current.forEach(controller => controller.abort());
      requestsRef.current.clear();
    };
  }, []);

  const makeRequest = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit & UseApiOptions = {}
  ): Promise<T> => {
    const {
      enableCaching = defaultOptions.enableCaching,
      enableDeduplication = defaultOptions.enableDeduplication,
      retries = defaultOptions.retries,
      timeout = defaultOptions.timeout,
      cacheTTL = defaultOptions.cacheTTL,
      ...fetchOptions
    } = options;

    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
    const method = fetchOptions.method || 'GET';
    
    // Create abort controller for this request
    const controller = new AbortController();
    const requestKey = `${method}:${url}`;
    requestsRef.current.set(requestKey, controller);

    try {
      let response: Response;

      // Choose the appropriate fetch method based on options
      if (method === 'GET' && enableCaching) {
        response = await cachedGet(url, `${url}:${cacheTTL || 300}`);
      } else if (method === 'POST' && enableDeduplication) {
        response = await deduplicatedPost(url, fetchOptions.body, {
          ...fetchOptions,
          signal: controller.signal,
          retries,
          timeout,
        });
      } else if (retries && retries > 0) {
        response = await reliableRequest(url, {
          ...fetchOptions,
          signal: controller.signal,
          retries,
          timeout,
        });
      } else {
        response = await trackedFetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          dedupe: enableDeduplication,
          timeout,
        });
      }

      // Remove from pending requests
      requestsRef.current.delete(requestKey);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text() as unknown as T;
      } else {
        return await response.blob() as unknown as T;
      }

    } catch (error) {
      requestsRef.current.delete(requestKey);
      
      // Don't throw on abort (component unmounted)
      if (error instanceof Error && error.name === 'AbortError') {
        return Promise.reject(new Error('Request cancelled'));
      }
      
      throw error;
    }
  }, [baseUrl, defaultOptions]);

  // Convenience methods
  const get = useCallback(<T = any>(endpoint: string, options: UseApiOptions = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }, [makeRequest]);

  const post = useCallback(<T = any>(endpoint: string, data?: any, options: UseApiOptions = {}) => {
    return makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const put = useCallback(<T = any>(endpoint: string, data?: any, options: UseApiOptions = {}) => {
    return makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  const del = useCallback(<T = any>(endpoint: string, options: UseApiOptions = {}) => {
    return makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }, [makeRequest]);

  const patch = useCallback(<T = any>(endpoint: string, data?: any, options: UseApiOptions = {}) => {
    return makeRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [makeRequest]);

  // Cancel all pending requests for this hook instance
  const cancelAllRequests = useCallback(() => {
    requestsRef.current.forEach(controller => controller.abort());
    requestsRef.current.clear();
  }, []);

  // Get performance stats
  const getPerformanceStats = useCallback(() => {
    return apiTracker.getAllStats();
  }, []);

  return {
    request: makeRequest,
    get,
    post,
    put,
    delete: del,
    patch,
    cancelAllRequests,
    getPerformanceStats,
  };
}

/**
 * Hook for API calls with authentication
 */
export function useAuthenticatedApi(baseUrl: string = '/api/v1', defaultOptions: UseApiOptions = {}) {
  const api = useApiPerformance(baseUrl, defaultOptions);

  const makeAuthenticatedRequest = useCallback(async <T = any>(
    endpoint: string,
    options: RequestInit & UseApiOptions = {}
  ): Promise<T> => {
    // Get token from localStorage (or wherever you store it)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    return api.request<T>(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  }, [api]);

  return {
    ...api,
    request: makeAuthenticatedRequest,
    // Override methods to include auth by default
    get: useCallback(<T = any>(endpoint: string, options: UseApiOptions = {}) => {
      return makeAuthenticatedRequest<T>(endpoint, { ...options, method: 'GET' });
    }, [makeAuthenticatedRequest]),
    
    post: useCallback(<T = any>(endpoint: string, data?: any, options: UseApiOptions = {}) => {
      return makeAuthenticatedRequest<T>(endpoint, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });
    }, [makeAuthenticatedRequest]),
  };
}

/**
 * Hook for optimized data fetching with built-in caching
 */
export function useCachedApi(baseUrl: string = '/api/v1', cacheTTL: number = 300000) {
  return useApiPerformance(baseUrl, {
    enableCaching: true,
    enableDeduplication: true,
    cacheTTL,
    retries: 1,
    timeout: 10000,
  });
}

/**
 * Hook for reliable API calls with retries
 */
export function useReliableApi(baseUrl: string = '/api/v1') {
  return useApiPerformance(baseUrl, {
    enableDeduplication: true,
    retries: 3,
    timeout: 15000,
  });
}

export default useApiPerformance;
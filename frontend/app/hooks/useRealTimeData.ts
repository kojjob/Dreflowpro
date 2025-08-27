'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseRealTimeDataOptions {
  interval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseRealTimeDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useRealTimeData<T>(
  fetchFunction: () => Promise<T>,
  options: UseRealTimeDataOptions = {}
): UseRealTimeDataResult<T> {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFunction();
      
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  }, [fetchFunction, onError]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Set loading to false when disabled and don't perform initial fetch
      if (mountedRef.current) {
        setLoading(false);
      }
      return;
    }

    // Initial fetch
    fetchData();

    // Set up interval
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData, interval, enabled]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  };
}

// Hook for managing multiple real-time data sources
export function useMultipleRealTimeData<T extends Record<string, any>>(
  fetchFunctions: { [K in keyof T]: () => Promise<T[K]> },
  options: UseRealTimeDataOptions = {}
): UseRealTimeDataResult<T> {
  const {
    interval = 30000,
    enabled = true,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const promises = Object.entries(fetchFunctions).map(async ([key, fetchFn]) => {
        const result = await fetchFn();
        return [key, result];
      });

      const results = await Promise.allSettled(promises);
      const successfulResults: Partial<T> = {};
      let hasErrors = false;

      results.forEach((result, index) => {
        const [key] = Object.entries(fetchFunctions)[index];
        if (result.status === 'fulfilled') {
          const [, value] = result.value;
          (successfulResults as any)[key] = value;
        } else {
          hasErrors = true;
          const errorMessage = result.reason?.message || String(result.reason);
          
          // Handle different error types gracefully
          if (errorMessage.includes('Authentication failed')) {
            // Skip authentication errors - these will be handled by AuthContext
            console.warn(`Authentication required for ${key}`);
          } else if (errorMessage.includes('API endpoint not available') || errorMessage.includes('Not Found')) {
            // Skip 404 errors for missing endpoints
            console.warn(`API endpoint not available for ${key}`);
          } else if (onError && !errorMessage.includes('Failed to fetch')) {
            // Only call onError for unexpected errors
            onError(new Error(`Failed to fetch ${key}: ${result.reason}`));
          }
        }
      });

      if (mountedRef.current) {
        // Only set error if we have no successful results at all
        if (hasErrors && Object.keys(successfulResults).length === 0) {
          setError('Failed to fetch any data');
        } else {
          // We have some data (either from API or fallback), so clear any previous errors
          setData(successfulResults as T);
          setLastUpdated(new Date());
          setError(null);
        }
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  }, [fetchFunctions, onError]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Set loading to false when disabled and don't perform initial fetch
      if (mountedRef.current) {
        setLoading(false);
      }
      return;
    }

    // Initial fetch
    fetchAllData();

    // Set up interval
    intervalRef.current = setInterval(fetchAllData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchAllData, interval, enabled]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  };
}
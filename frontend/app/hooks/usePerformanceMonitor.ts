'use client';

import { useEffect, useRef, useState } from 'react';
import Logger from '../utils/logger';
import { trackComponentRender, trackMemoryUsage } from '../utils/performanceMetrics';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  reRenderCount: number;
  lastRenderTime: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  threshold?: number; // Warning threshold in ms
  logToConsole?: boolean;
}

export const usePerformanceMonitor = ({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  threshold = 100,
  logToConsole = true
}: UsePerformanceMonitorOptions) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const renderStartTime = useRef<number>(performance.now());
  const renderCount = useRef<number>(0);
  const mountTime = useRef<number>(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - renderStartTime.current;
    
    // Count DOM elements as a proxy for component complexity
    const componentCount = document.querySelectorAll('*').length;
    
    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    const newMetrics: PerformanceMetrics = {
      renderTime,
      componentCount,
      memoryUsage,
      reRenderCount: renderCount.current,
      lastRenderTime: endTime
    };

    setMetrics(newMetrics);

    // Track with centralized performance collector
    trackComponentRender(componentName, renderTime);
    if (memoryUsage) {
      trackMemoryUsage();
    }

    if (logToConsole) {
      Logger.log(`🚀 Performance Metrics: ${componentName}`);
      Logger.log(`⏱️ Render Time: ${renderTime.toFixed(2)}ms`);
      Logger.log(`🔄 Re-render Count: ${renderCount.current}`);
      Logger.log(`🧩 DOM Elements: ${componentCount}`);
      
      if (memoryUsage) {
        Logger.log(`💾 Memory Usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
      
      // Performance warnings
      if (renderTime > threshold) {
        Logger.warn(`⚠️ Slow render detected in ${componentName} (${renderTime.toFixed(2)}ms)`);
      }
      
      if (renderCount.current > 10) {
        Logger.warn(`⚠️ High re-render count in ${componentName} (${renderCount.current} renders)`);
      }
      
      if (componentCount > 1000) {
        Logger.warn(`⚠️ High DOM complexity in ${componentName} (${componentCount} elements)`);
      }
    }

    // Reset start time for next render
    renderStartTime.current = performance.now();
  }, []); // Empty dependency array - only run on mount

  // Reset metrics on unmount
  useEffect(() => {
    return () => {
      if (enabled && logToConsole) {
        const totalTime = performance.now() - mountTime.current;
        Logger.log(`📊 Component ${componentName} unmounted after ${totalTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, enabled, logToConsole]);

  return metrics;
};

// Hook for measuring specific operations
export const useOperationTimer = (operationName: string, enabled = true) => {
  const startTimer = () => {
    if (!enabled) return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      Logger.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      
      if (duration > 100) {
        Logger.warn(`⚠️ Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }
    };
  };

  return { startTimer };
};

// Hook for monitoring bundle size impact
export const useBundleMonitor = (componentName: string) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Log when component is loaded (useful for bundle analysis)
      Logger.log(`📦 Component loaded: ${componentName}`);
      
      // Check if component is being loaded multiple times
      const loadKey = `component_load_${componentName}`;
      const loadCount = parseInt(sessionStorage.getItem(loadKey) || '0') + 1;
      sessionStorage.setItem(loadKey, loadCount.toString());
      
      if (loadCount > 1) {
        Logger.warn(`⚠️ Component ${componentName} loaded ${loadCount} times in this session`);
      }
    }
  }, [componentName]);
};

export default usePerformanceMonitor;

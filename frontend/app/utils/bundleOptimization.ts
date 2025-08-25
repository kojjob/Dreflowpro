'use client';

/**
 * Bundle optimization utilities for improved performance
 */

import React from 'react';

// Bundle splitting strategies for different component types
export const BUNDLE_STRATEGIES = {
  CRITICAL: 'critical',      // Load immediately (auth, layout)
  ABOVE_FOLD: 'above-fold',  // Load on page load (visible content)
  BELOW_FOLD: 'below-fold',  // Load on scroll or interaction
  ON_DEMAND: 'on-demand',    // Load on user action (modals, charts)
  BACKGROUND: 'background',   // Load during idle time
} as const;

export type BundleStrategy = typeof BUNDLE_STRATEGIES[keyof typeof BUNDLE_STRATEGIES];

// Chunk names for better debugging and caching
export const CHUNK_NAMES = {
  // Core chunks
  VENDOR: 'vendor',
  COMMON: 'common',
  RUNTIME: 'runtime',
  
  // Feature chunks
  AUTH: 'auth',
  DASHBOARD: 'dashboard',
  DATA_ANALYSIS: 'data-analysis',
  CHARTS: 'charts',
  REPORTS: 'reports',
  AI_INSIGHTS: 'ai-insights',
  EXPORT: 'export',
  
  // UI chunks
  MODALS: 'modals',
  FORMS: 'forms',
  TABLES: 'tables',
  
  // Third-party chunks
  CHART_JS: 'chart-js',
  FRAMER_MOTION: 'framer-motion',
  EDITOR: 'editor',
} as const;

/**
 * Bundle size monitoring and optimization utilities
 */
export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private loadingComponents = new Set<string>();
  private loadedComponents = new Set<string>();
  private performanceObserver?: PerformanceObserver;

  static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initPerformanceMonitoring();
    }
  }

  /**
   * Initialize performance monitoring for bundle loading
   */
  private initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('chunk') || entry.name.includes('_next/static/chunks/')) {
            this.logChunkLoad(entry);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
    }
  }

  /**
   * Log chunk loading performance
   */
  private logChunkLoad(entry: PerformanceEntry) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Chunk loaded: ${entry.name} (${entry.duration?.toFixed(2)}ms)`);
    }
  }

  /**
   * Track component loading state
   */
  trackComponentLoad(componentName: string, strategy: BundleStrategy) {
    this.loadingComponents.add(componentName);
    
    const startTime = performance.now();
    
    return () => {
      this.loadingComponents.delete(componentName);
      this.loadedComponents.add(componentName);
      
      const loadTime = performance.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ Component loaded: ${componentName} (${strategy}) - ${loadTime.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Get bundle loading statistics
   */
  getStats() {
    return {
      loading: Array.from(this.loadingComponents),
      loaded: Array.from(this.loadedComponents),
      totalLoaded: this.loadedComponents.size,
      totalLoading: this.loadingComponents.size,
    };
  }

  /**
   * Preload critical chunks
   */
  preloadCriticalChunks() {
    if (typeof window === 'undefined') return;

    const criticalChunks = [
      CHUNK_NAMES.AUTH,
      CHUNK_NAMES.DASHBOARD,
    ];

    criticalChunks.forEach(chunk => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = `/_next/static/chunks/${chunk}.js`;
      document.head.appendChild(link);
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

/**
 * HOC for tracking component bundle performance
 */
export function withBundleTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  strategy: BundleStrategy = BUNDLE_STRATEGIES.ON_DEMAND
) {
  const TrackedComponent = (props: P) => {
    React.useEffect(() => {
      const optimizer = BundleOptimizer.getInstance();
      const trackingCleanup = optimizer.trackComponentLoad(componentName, strategy);
      
      return trackingCleanup;
    }, []);

    return React.createElement(Component, props);
  };

  TrackedComponent.displayName = `withBundleTracking(${componentName})`;
  return TrackedComponent;
}

/**
 * Hook for bundle optimization insights
 */
export function useBundleOptimization() {
  const [stats, setStats] = React.useState(() => 
    BundleOptimizer.getInstance().getStats()
  );

  React.useEffect(() => {
    const optimizer = BundleOptimizer.getInstance();
    
    const updateStats = () => {
      setStats(optimizer.getStats());
    };

    const interval = setInterval(updateStats, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  return stats;
}

/**
 * Intelligent chunk preloading based on user behavior
 */
export class IntelligentPreloader {
  private static instance: IntelligentPreloader;
  private preloadedChunks = new Set<string>();
  private userInteractions = 0;
  private preloadThreshold = 3; // Preload after 3 interactions

  static getInstance(): IntelligentPreloader {
    if (!IntelligentPreloader.instance) {
      IntelligentPreloader.instance = new IntelligentPreloader();
    }
    return IntelligentPreloader.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initInteractionTracking();
    }
  }

  /**
   * Track user interactions for intelligent preloading
   */
  private initInteractionTracking() {
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    
    const handleInteraction = () => {
      this.userInteractions++;
      
      if (this.userInteractions >= this.preloadThreshold) {
        this.preloadNextLikelyChunks();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { 
        passive: true, 
        once: true 
      });
    });
  }

  /**
   * Preload chunks that user is likely to need next
   */
  private preloadNextLikelyChunks() {
    const likelyChunks = [
      CHUNK_NAMES.DATA_ANALYSIS,
      CHUNK_NAMES.CHARTS,
      CHUNK_NAMES.REPORTS,
    ];

    likelyChunks.forEach(chunk => {
      if (!this.preloadedChunks.has(chunk)) {
        this.preloadChunk(chunk);
      }
    });
  }

  /**
   * Preload a specific chunk
   */
  private preloadChunk(chunkName: string) {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'prefetch'; // Use prefetch for low priority
    link.as = 'script';
    link.href = `/_next/static/chunks/${chunkName}.js`;
    
    link.onload = () => {
      this.preloadedChunks.add(chunkName);
      console.log(`🚀 Preloaded chunk: ${chunkName}`);
    };
    
    document.head.appendChild(link);
  }

  /**
   * Preload chunk on hover (for navigation)
   */
  preloadOnHover(chunkName: string, element: HTMLElement) {
    const preload = () => {
      if (!this.preloadedChunks.has(chunkName)) {
        this.preloadChunk(chunkName);
      }
    };

    element.addEventListener('mouseenter', preload, { once: true });
    element.addEventListener('focusin', preload, { once: true });
  }
}

/**
 * React hook for intelligent preloading
 */
export function useIntelligentPreloading() {
  React.useEffect(() => {
    const preloader = IntelligentPreloader.getInstance();
    // Preloader automatically starts tracking interactions
    return () => {
      // Cleanup if needed
    };
  }, []);

  return IntelligentPreloader.getInstance();
}

/**
 * Component for monitoring bundle performance in development
 */
export function BundlePerformanceMonitor() {
  const stats = useBundleOptimization();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return React.createElement('div', {
    className: "fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50"
  }, [
    React.createElement('div', { key: 'title', className: "mb-2 font-bold" }, 'Bundle Stats'),
    React.createElement('div', { key: 'loaded' }, `Loaded: ${stats.totalLoaded}`),
    React.createElement('div', { key: 'loading' }, `Loading: ${stats.totalLoading}`),
    stats.loading.length > 0 && React.createElement('div', {
      key: 'loading-list',
      className: "text-yellow-300"
    }, `Loading: ${stats.loading.join(', ')}`)
  ].filter(Boolean));
}

// Export singleton instances
export const bundleOptimizer = BundleOptimizer.getInstance();
export const intelligentPreloader = IntelligentPreloader.getInstance();
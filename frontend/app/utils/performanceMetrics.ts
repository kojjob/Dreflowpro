/**
 * Comprehensive performance metrics collection and analysis system
 */

interface WebVitalsMetrics {
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  TTFB: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint (replaces FID)
}

interface CustomMetrics {
  renderTime: number;
  componentLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  bundleLoadTime: number;
  memoryUsage: number;
  errorRate: number;
}

interface UserExperienceMetrics {
  pageLoadTime: number;
  interactionLatency: number;
  scrollPerformance: number;
  navigationTime: number;
  timeToInteractive: number;
}

interface PerformanceData {
  timestamp: number;
  url: string;
  userAgent: string;
  webVitals: Partial<WebVitalsMetrics>;
  customMetrics: Partial<CustomMetrics>;
  uxMetrics: Partial<UserExperienceMetrics>;
  sessionId: string;
  userId?: string;
}

export class PerformanceCollector {
  private static instance: PerformanceCollector;
  private metrics: PerformanceData[] = [];
  private sessionId: string;
  private observer?: PerformanceObserver;
  private vitalsObserver?: any;

  static getInstance(): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector();
    }
    return PerformanceCollector.instance;
  }

  private constructor() {
    this.sessionId = this.generateSessionId();
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializePerformanceObserver();
      this.trackNavigationTiming();
    }
  }

  /**
   * Initialize Web Vitals tracking
   */
  private async initializeWebVitals() {
    try {
      // Dynamic import to avoid SSR issues
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

      getCLS((metric) => this.recordWebVital('CLS', metric.value));
      getFID((metric) => this.recordWebVital('FID', metric.value));
      getFCP((metric) => this.recordWebVital('FCP', metric.value));
      getLCP((metric) => this.recordWebVital('LCP', metric.value));
      getTTFB((metric) => this.recordWebVital('TTFB', metric.value));

      // Try to get INP if available (newer metric)
      try {
        const { getINP } = await import('web-vitals');
        getINP((metric) => this.recordWebVital('INP', metric.value));
      } catch {
        // INP not available in older versions
      }
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  /**
   * Initialize Performance Observer for detailed metrics
   */
  private initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });

      // Observe different types of performance entries
      try {
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        // Fallback for browsers that don't support all entry types
        this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
      }
    }
  }

  /**
   * Track navigation timing metrics
   */
  private trackNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.recordCustomMetric('pageLoadTime', navigation.loadEventEnd - navigation.fetchStart);
        this.recordCustomMetric('renderTime', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        this.recordUXMetric('timeToInteractive', navigation.domInteractive - navigation.fetchStart);
      }
    });
  }

  /**
   * Process individual performance entries
   */
  private processPerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'resource':
        this.processResourceEntry(entry as PerformanceResourceTiming);
        break;
      case 'navigation':
        this.processNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'paint':
        this.processPaintEntry(entry);
        break;
      case 'largest-contentful-paint':
        this.recordWebVital('LCP', entry.startTime);
        break;
      case 'first-input':
        this.recordWebVital('FID', (entry as any).processingStart - entry.startTime);
        break;
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.recordWebVital('CLS', (entry as any).value);
        }
        break;
    }
  }

  /**
   * Process resource loading entries
   */
  private processResourceEntry(entry: PerformanceResourceTiming) {
    // Track bundle loading times
    if (entry.name.includes('_next/static/chunks/') || entry.name.includes('.js')) {
      this.recordCustomMetric('bundleLoadTime', entry.responseEnd - entry.fetchStart);
    }

    // Track API response times
    if (entry.name.includes('/api/')) {
      this.recordCustomMetric('apiResponseTime', entry.responseEnd - entry.requestStart);
    }
  }

  /**
   * Process navigation entries
   */
  private processNavigationEntry(entry: PerformanceNavigationTiming) {
    this.recordUXMetric('navigationTime', entry.responseEnd - entry.fetchStart);
    this.recordUXMetric('pageLoadTime', entry.loadEventEnd - entry.fetchStart);
  }

  /**
   * Process paint entries
   */
  private processPaintEntry(entry: PerformanceEntry) {
    if (entry.name === 'first-contentful-paint') {
      this.recordWebVital('FCP', entry.startTime);
    }
  }

  /**
   * Record Web Vitals metric
   */
  private recordWebVital(metric: keyof WebVitalsMetrics, value: number) {
    this.ensureCurrentMetric().webVitals[metric] = value;
    this.logMetric(`Web Vital - ${metric}`, value, this.getWebVitalThreshold(metric));
  }

  /**
   * Record custom metric
   */
  recordCustomMetric(metric: keyof CustomMetrics, value: number) {
    this.ensureCurrentMetric().customMetrics[metric] = value;
    this.logMetric(`Custom - ${metric}`, value, this.getCustomMetricThreshold(metric));
  }

  /**
   * Record UX metric
   */
  private recordUXMetric(metric: keyof UserExperienceMetrics, value: number) {
    this.ensureCurrentMetric().uxMetrics[metric] = value;
    this.logMetric(`UX - ${metric}`, value, this.getUXMetricThreshold(metric));
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number) {
    this.recordCustomMetric('renderTime', renderTime);
    
    if (renderTime > 100) {
      console.warn(`⚠️ Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, success: boolean) {
    this.recordCustomMetric('apiResponseTime', duration);
    
    // Update error rate
    const currentErrorRate = this.ensureCurrentMetric().customMetrics.errorRate || 0;
    const newErrorRate = success ? currentErrorRate * 0.95 : currentErrorRate * 1.05;
    this.recordCustomMetric('errorRate', Math.min(newErrorRate, 1));

    if (duration > 2000) {
      console.warn(`⚠️ Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsageMB = memory.usedJSHeapSize / 1024 / 1024;
      this.recordCustomMetric('memoryUsage', memoryUsageMB);

      if (memoryUsageMB > 100) {
        console.warn(`⚠️ High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      }
    }
  }

  /**
   * Track cache performance
   */
  trackCacheHit(hit: boolean) {
    const currentRate = this.ensureCurrentMetric().customMetrics.cacheHitRate || 0;
    const newRate = hit ? currentRate * 0.9 + 0.1 : currentRate * 0.9;
    this.recordCustomMetric('cacheHitRate', newRate);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: any;
    recommendations: string[];
    score: number;
  } {
    const latest = this.getCurrentMetrics();
    if (!latest) {
      return { summary: {}, recommendations: [], score: 0 };
    }

    const recommendations: string[] = [];
    let score = 100;

    // Analyze Web Vitals
    if (latest.webVitals.LCP && latest.webVitals.LCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint - consider image optimization and lazy loading');
      score -= 15;
    }

    if (latest.webVitals.FID && latest.webVitals.FID > 100) {
      recommendations.push('Reduce First Input Delay - optimize JavaScript execution');
      score -= 10;
    }

    if (latest.webVitals.CLS && latest.webVitals.CLS > 0.1) {
      recommendations.push('Improve Cumulative Layout Shift - specify image dimensions and avoid dynamic content');
      score -= 20;
    }

    // Analyze custom metrics
    if (latest.customMetrics.apiResponseTime && latest.customMetrics.apiResponseTime > 1000) {
      recommendations.push('Optimize API response times - consider caching and query optimization');
      score -= 10;
    }

    if (latest.customMetrics.memoryUsage && latest.customMetrics.memoryUsage > 50) {
      recommendations.push('Optimize memory usage - check for memory leaks and optimize component lifecycle');
      score -= 5;
    }

    if (latest.customMetrics.cacheHitRate && latest.customMetrics.cacheHitRate < 0.7) {
      recommendations.push('Improve cache hit rate - optimize caching strategy');
      score -= 8;
    }

    return {
      summary: {
        webVitals: latest.webVitals,
        performance: latest.customMetrics,
        userExperience: latest.uxMetrics,
        timestamp: latest.timestamp,
      },
      recommendations,
      score: Math.max(score, 0),
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceData[] {
    return [...this.metrics];
  }

  /**
   * Clear collected metrics
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * Utility methods
   */
  private ensureCurrentMetric(): PerformanceData {
    const current = this.metrics[this.metrics.length - 1];
    if (!current || Date.now() - current.timestamp > 30000) {
      // Create new metric entry if none exists or last one is older than 30 seconds
      const newMetric: PerformanceData = {
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        webVitals: {},
        customMetrics: {},
        uxMetrics: {},
        sessionId: this.sessionId,
      };
      this.metrics.push(newMetric);
      return newMetric;
    }
    return current;
  }

  private getCurrentMetrics(): PerformanceData | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logMetric(name: string, value: number, threshold?: number) {
    if (process.env.NODE_ENV === 'development') {
      const unit = this.getMetricUnit(name);
      const formattedValue = `${value.toFixed(2)}${unit}`;
      
      if (threshold && value > threshold) {
        console.warn(`⚠️ ${name}: ${formattedValue} (exceeds threshold: ${threshold}${unit})`);
      } else {
        console.log(`📊 ${name}: ${formattedValue}`);
      }
    }
  }

  private getMetricUnit(metricName: string): string {
    if (metricName.includes('Time') || metricName.includes('FCP') || metricName.includes('LCP') || metricName.includes('FID') || metricName.includes('TTFB')) {
      return 'ms';
    }
    if (metricName.includes('Memory')) {
      return 'MB';
    }
    if (metricName.includes('Rate')) {
      return '%';
    }
    return '';
  }

  private getWebVitalThreshold(metric: keyof WebVitalsMetrics): number {
    const thresholds: Record<keyof WebVitalsMetrics, number> = {
      CLS: 0.1,
      FID: 100,
      FCP: 1800,
      LCP: 2500,
      TTFB: 800,
      INP: 200,
    };
    return thresholds[metric];
  }

  private getCustomMetricThreshold(metric: keyof CustomMetrics): number {
    const thresholds: Record<keyof CustomMetrics, number> = {
      renderTime: 100,
      componentLoadTime: 500,
      apiResponseTime: 1000,
      cacheHitRate: 0.7,
      bundleLoadTime: 1000,
      memoryUsage: 50,
      errorRate: 0.05,
    };
    return thresholds[metric];
  }

  private getUXMetricThreshold(metric: keyof UserExperienceMetrics): number {
    const thresholds: Record<keyof UserExperienceMetrics, number> = {
      pageLoadTime: 3000,
      interactionLatency: 50,
      scrollPerformance: 16,
      navigationTime: 1000,
      timeToInteractive: 3800,
    };
    return thresholds[metric];
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton instance
export const performanceCollector = PerformanceCollector.getInstance();

// Utility functions for easy access
export const trackComponentRender = (componentName: string, renderTime: number) => {
  performanceCollector.trackComponentRender(componentName, renderTime);
};

export const trackAPICall = (endpoint: string, duration: number, success: boolean) => {
  performanceCollector.trackAPICall(endpoint, duration, success);
};

export const trackMemoryUsage = () => {
  performanceCollector.trackMemoryUsage();
};

export const trackCacheHit = (hit: boolean) => {
  performanceCollector.trackCacheHit(hit);
};

export const generatePerformanceReport = () => {
  return performanceCollector.generateReport();
};

export default performanceCollector;
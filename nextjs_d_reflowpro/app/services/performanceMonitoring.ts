// Performance Monitoring Service
// Integrates with external monitoring services and provides real-time metrics

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

class PerformanceMonitoringService {
  private apiEndpoint: string;
  private apiKey: string;
  private isEnabled: boolean;
  private buffer: PerformanceMetric[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private maxBufferSize: number = 100;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_PERFORMANCE_API_ENDPOINT || '';
    this.apiKey = process.env.NEXT_PUBLIC_PERFORMANCE_API_KEY || '';
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true';
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Initialize Web Vitals monitoring
    this.initWebVitals();
    
    // Initialize custom performance monitoring
    this.initCustomMetrics();
    
    // Set up periodic flushing
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  private async initWebVitals() {
    try {
      // Dynamic import to avoid SSR issues
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      
      getCLS(this.handleWebVital.bind(this));
      getFID(this.handleWebVital.bind(this));
      getFCP(this.handleWebVital.bind(this));
      getLCP(this.handleWebVital.bind(this));
      getTTFB(this.handleWebVital.bind(this));
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  private handleWebVital(metric: WebVitalsMetric) {
    this.recordMetric({
      name: `web_vitals_${metric.name.toLowerCase()}`,
      value: metric.value,
      unit: metric.name === 'CLS' ? 'score' : 'ms',
      timestamp: Date.now(),
      tags: {
        id: metric.id,
        navigationType: metric.navigationType
      }
    });

    // Send critical metrics immediately
    if (metric.name === 'LCP' || metric.name === 'CLS') {
      this.flush();
    }
  }

  private initCustomMetrics() {
    // Monitor bundle size
    this.monitorBundleSize();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor navigation timing
    this.monitorNavigationTiming();
    
    // Monitor resource timing
    this.monitorResourceTiming();
  }

  private monitorBundleSize() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              name: 'bundle_transfer_size',
              value: navEntry.transferSize || 0,
              unit: 'bytes',
              timestamp: Date.now()
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private monitorMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      
      setInterval(() => {
        this.recordMetric({
          name: 'memory_used_js_heap_size',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now()
        });
        
        this.recordMetric({
          name: 'memory_total_js_heap_size',
          value: memory.totalJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now()
        });
      }, 10000); // Every 10 seconds
    }
  }

  private monitorNavigationTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          // DNS lookup time
          this.recordMetric({
            name: 'dns_lookup_time',
            value: navigation.domainLookupEnd - navigation.domainLookupStart,
            unit: 'ms',
            timestamp: Date.now()
          });
          
          // TCP connection time
          this.recordMetric({
            name: 'tcp_connection_time',
            value: navigation.connectEnd - navigation.connectStart,
            unit: 'ms',
            timestamp: Date.now()
          });
          
          // Server response time
          this.recordMetric({
            name: 'server_response_time',
            value: navigation.responseEnd - navigation.requestStart,
            unit: 'ms',
            timestamp: Date.now()
          });
          
          // DOM content loaded
          this.recordMetric({
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            unit: 'ms',
            timestamp: Date.now()
          });
          
          // Page load complete
          this.recordMetric({
            name: 'page_load_complete',
            value: navigation.loadEventEnd - navigation.navigationStart,
            unit: 'ms',
            timestamp: Date.now()
          });
        }
      });
    }
  }

  private monitorResourceTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          // Track large resources
          if (resource.transferSize > 100000) { // > 100KB
            this.recordMetric({
              name: 'large_resource_load_time',
              value: resource.responseEnd - resource.startTime,
              unit: 'ms',
              timestamp: Date.now(),
              tags: {
                resource: resource.name,
                size: resource.transferSize.toString()
              }
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  public recordMetric(metric: PerformanceMetric) {
    if (!this.isEnabled) return;
    
    this.buffer.push(metric);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  public recordCustomMetric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>) {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    });
  }

  public recordComponentRenderTime(componentName: string, renderTime: number) {
    this.recordMetric({
      name: 'component_render_time',
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
      tags: {
        component: componentName
      }
    });
  }

  public recordUserInteraction(action: string, duration?: number) {
    this.recordMetric({
      name: 'user_interaction',
      value: duration || 1,
      unit: duration ? 'ms' : 'count',
      timestamp: Date.now(),
      tags: {
        action
      }
    });
  }

  private async flush() {
    if (this.buffer.length === 0 || !this.apiEndpoint) return;
    
    const metrics = [...this.buffer];
    this.buffer = [];
    
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
      // Re-add metrics to buffer for retry
      this.buffer.unshift(...metrics);
    }
  }

  // Integration with popular monitoring services
  public sendToDatadog(metric: PerformanceMetric) {
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      (window as any).DD_RUM.addUserAction(metric.name, {
        value: metric.value,
        unit: metric.unit,
        ...metric.tags
      });
    }
  }

  public sendToNewRelic(metric: PerformanceMetric) {
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction(metric.name, {
        value: metric.value,
        unit: metric.unit,
        ...metric.tags
      });
    }
  }

  public sendToSentry(metric: PerformanceMetric) {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        message: `Performance metric: ${metric.name}`,
        level: 'info',
        data: {
          value: metric.value,
          unit: metric.unit,
          ...metric.tags
        }
      });
    }
  }

  // Performance budget checking
  public checkPerformanceBudget() {
    const budgets = {
      'web_vitals_lcp': 2500, // 2.5s
      'web_vitals_fid': 100,  // 100ms
      'web_vitals_cls': 0.1,  // 0.1
      'bundle_transfer_size': 2097152, // 2MB
      'page_load_complete': 3000 // 3s
    };

    const violations: string[] = [];
    
    this.buffer.forEach(metric => {
      const budget = budgets[metric.name as keyof typeof budgets];
      if (budget && metric.value > budget) {
        violations.push(`${metric.name}: ${metric.value}${metric.unit} exceeds budget of ${budget}${metric.unit}`);
      }
    });

    if (violations.length > 0) {
      console.warn('Performance budget violations:', violations);
      
      // Send alert
      this.recordMetric({
        name: 'performance_budget_violation',
        value: violations.length,
        unit: 'count',
        timestamp: Date.now(),
        tags: {
          violations: violations.join(', ')
        }
      });
    }

    return violations;
  }
}

// Singleton instance
export const performanceMonitoring = new PerformanceMonitoringService();

// React hook for easy integration
export const usePerformanceTracking = () => {
  return {
    recordMetric: performanceMonitoring.recordCustomMetric.bind(performanceMonitoring),
    recordRenderTime: performanceMonitoring.recordComponentRenderTime.bind(performanceMonitoring),
    recordInteraction: performanceMonitoring.recordUserInteraction.bind(performanceMonitoring),
    checkBudget: performanceMonitoring.checkPerformanceBudget.bind(performanceMonitoring)
  };
};

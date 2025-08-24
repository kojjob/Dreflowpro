// Performance configuration for DreflowPro
module.exports = {
  // Bundle analysis configuration
  bundleAnalyzer: {
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: true,
    generateStatsFile: true,
    statsFilename: 'bundle-stats.json',
    analyzerMode: 'static',
    reportFilename: 'bundle-report.html',
  },

  // Performance budgets (in bytes)
  budgets: {
    // Initial bundle size limits
    initialJS: 250 * 1024, // 250KB
    initialCSS: 50 * 1024,  // 50KB
    
    // Route-specific budgets
    routes: {
      '/dashboard': 300 * 1024, // 300KB for dashboard
      '/': 200 * 1024,          // 200KB for landing page
    },
    
    // Asset budgets
    images: 500 * 1024,    // 500KB per image
    fonts: 100 * 1024,     // 100KB per font
    
    // Total bundle budget
    total: 2 * 1024 * 1024, // 2MB total
  },

  // Optimization settings
  optimization: {
    // Code splitting thresholds
    splitChunks: {
      minSize: 20000,      // 20KB minimum chunk size
      maxSize: 244000,     // 244KB maximum chunk size
      maxAsyncRequests: 30, // Maximum async requests
      maxInitialRequests: 30, // Maximum initial requests
    },
    
    // Tree shaking configuration
    treeShaking: {
      enabled: true,
      sideEffects: false,
      usedExports: true,
    },
    
    // Minification settings
    minification: {
      removeConsole: process.env.NODE_ENV === 'production',
      removeDebugger: true,
      dropDeadCode: true,
    },
  },

  // Performance monitoring
  monitoring: {
    // Core Web Vitals thresholds
    coreWebVitals: {
      LCP: 2500,  // Largest Contentful Paint (ms)
      FID: 100,   // First Input Delay (ms)
      CLS: 0.1,   // Cumulative Layout Shift
      FCP: 1800,  // First Contentful Paint (ms)
      TTFB: 800,  // Time to First Byte (ms)
    },
    
    // Custom metrics
    customMetrics: {
      componentRenderTime: 100,    // Component render threshold (ms)
      apiResponseTime: 1000,       // API response threshold (ms)
      imageLoadTime: 2000,         // Image load threshold (ms)
      routeChangeTime: 500,        // Route change threshold (ms)
    },
    
    // Performance alerts
    alerts: {
      enabled: process.env.NODE_ENV === 'development',
      thresholds: {
        slowRender: 100,     // Slow render warning (ms)
        memoryLeak: 50,      // Memory usage increase (MB)
        bundleSize: 10,      // Bundle size increase (%)
      },
    },
  },

  // Caching strategies
  caching: {
    // Static assets
    staticAssets: {
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    
    // API responses
    apiResponses: {
      maxAge: 300,      // 5 minutes
      staleWhileRevalidate: 60, // 1 minute
    },
    
    // Images
    images: {
      maxAge: 2592000,  // 30 days
      formats: ['webp', 'avif', 'jpeg'],
      sizes: [640, 750, 828, 1080, 1200, 1920],
      quality: 85,
    },
  },

  // Preloading strategies
  preloading: {
    // Critical resources
    critical: [
      '/fonts/geist-sans.woff2',
      '/api/auth/session',
    ],
    
    // Prefetch routes
    prefetch: [
      '/dashboard',
      '/pipelines',
      '/connectors',
    ],
    
    // Preload components
    components: [
      'MainDashboard',
      'DashboardStats',
    ],
  },

  // Development optimizations
  development: {
    // Fast refresh settings
    fastRefresh: {
      enabled: true,
      overlay: true,
    },
    
    // Source maps
    sourceMaps: {
      enabled: true,
      type: 'eval-source-map',
    },
    
    // Hot module replacement
    hmr: {
      enabled: true,
      port: 3001,
    },
  },

  // Production optimizations
  production: {
    // Compression
    compression: {
      gzip: true,
      brotli: true,
      level: 6,
    },
    
    // Asset optimization
    assets: {
      inlineLimit: 8192,    // 8KB inline limit
      publicPath: '/static/',
      cdnUrl: process.env.CDN_URL,
    },
    
    // Runtime optimization
    runtime: {
      chunk: 'single',
      runtimeChunk: true,
    },
  },
};

// Performance utilities
const performanceUtils = {
  // Measure component performance
  measureComponent: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    if (end - start > 100) {
      console.warn(`Slow component: ${name} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  },
  
  // Check bundle size
  checkBundleSize: (size, limit) => {
    if (size > limit) {
      console.warn(`Bundle size exceeded: ${size} > ${limit}`);
      return false;
    }
    return true;
  },
  
  // Monitor memory usage
  monitorMemory: () => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

module.exports.utils = performanceUtils;

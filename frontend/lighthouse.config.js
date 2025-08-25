module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard', 'http://localhost:3000/pipelines'],
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Resource budgets
        'total-byte-weight': ['error', { maxNumericValue: 2000000 }], // 2MB
        'unused-javascript': ['warn', { maxNumericValue: 100000 }], // 100KB
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }], // 50KB
        'modern-image-formats': 'error',
        'uses-optimized-images': 'error',
        'uses-text-compression': 'error',
        'uses-responsive-images': 'error',
        
        // Best practices
        'uses-http2': 'off', // Skip HTTP/2 check for local testing
        'uses-passive-event-listeners': 'error',
        'no-document-write': 'error',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

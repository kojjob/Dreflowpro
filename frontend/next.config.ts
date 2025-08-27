import type { NextConfig } from "next";

// Bundle analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

const nextConfig: NextConfig = {
  // ESLint configuration
  eslint: {
    // Ignore during builds for performance optimization
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    // Ignore build errors for performance optimization
    ignoreBuildErrors: true,
  },

  // Compiler optimizations
  compiler: {
    // Remove console statements in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn statements
    } : false,
    // Enable SWC minification for better performance
    styledComponents: true,
  },

  // Performance optimizations
  experimental: {
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'react-hook-form',
      '@hookform/resolvers',
      'chart.js',
      'react-chartjs-2',
      'sonner',
      'clsx',
      'tailwind-merge',
      'zod',
    ],

    // Enable modern bundling optimizations
    esmExternals: true,

    // Enable partial prerendering for better performance
    ppr: false, // Disable for now due to experimental nature
  },

  // Server external packages (moved from experimental)
  serverExternalPackages: [],

  // Turbopack configuration (separate from experimental)
  turbopack: {
    // Optimize for development builds
    resolveAlias: {
      '@': './app',
    },
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
        ],
      },
      // SEO-friendly cache headers
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
    ];
  },

  // SEO-friendly redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/etl-platform',
        destination: '/',
        permanent: true,
      },
      {
        source: '/data-integration',
        destination: '/features',
        permanent: true,
      },
      {
        source: '/integrations/:path*',
        destination: '/connectors/:path*',
        permanent: true,
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // Enhanced split chunks for better caching
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Framework chunks (React, Next.js)
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'framework',
              chunks: 'all',
              priority: 40,
              enforce: true,
            },
            // UI library chunks
            ui: {
              test: /[\\/]node_modules[\\/](lucide-react|framer-motion|sonner)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 30,
            },
            // Chart library chunks
            charts: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 25,
            },
            // Form libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 20,
            },
            // Vendor chunks (other node_modules)
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 10,
            },
            // Common chunks
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
          },
        },
        // Enable module concatenation
        concatenateModules: true,
        // Minimize bundle size
        minimize: true,
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'app'),
    };

    return config;
  },

  // Environment variable validation
  env: {
    // Validate required environment variables
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
  },

  // Output configuration
  output: 'standalone',
  
  // Power by header removal for security
  poweredByHeader: false,
};

export default withBundleAnalyzer(nextConfig);

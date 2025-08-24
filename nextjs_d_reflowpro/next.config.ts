import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint configuration
  eslint: {
    // Only ignore during builds in development
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // TypeScript configuration  
  typescript: {
    // Type check during builds in production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Compiler optimizations
  compiler: {
    // Remove console statements in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn statements
    } : false,
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
    ],
    
    // Enable Turbopack for faster builds in development
    turbo: {
      rules: {
        // Optimize TypeScript compilation
        '*.{ts,tsx}': {
          loaders: ['swc-loader'],
          as: '*.js',
        },
      },
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
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // Split chunks for better caching
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // Separate vendor chunks
            vendor: {
              test: /[\\|/]node_modules[\\|/]/,
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
      };
    }

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

export default nextConfig;

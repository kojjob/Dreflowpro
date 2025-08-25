'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Route loading fallback components
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Page...</h3>
      <p className="text-gray-600">Please wait while we prepare your workspace</p>
    </div>
  </div>
);

const DashboardLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Dashboard</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Preparing your analytics dashboard with real-time data and insights...
      </p>
    </div>
  </div>
);

const DataAnalysisLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-purple-900 mb-3">Loading Data Analysis</h2>
      <p className="text-purple-700 max-w-md mx-auto">
        Initializing advanced analytics tools and visualization components...
      </p>
    </div>
  </div>
);

const PipelinesLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-emerald-900 mb-3">Loading Pipelines</h2>
      <p className="text-emerald-700 max-w-md mx-auto">
        Setting up your data pipeline management interface...
      </p>
    </div>
  </div>
);

const ConnectorsLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-orange-900 mb-3">Loading Connectors</h2>
      <p className="text-orange-700 max-w-md mx-auto">
        Preparing data source integration tools...
      </p>
    </div>
  </div>
);

// Lazy load heavy page components
export const LazyMainDashboard = dynamic(
  () => import('../dashboard/MainDashboard'),
  {
    loading: () => <DashboardLoadingFallback />,
    ssr: false, // Dashboard has client-side state and real-time data
  }
);

export const LazyDataAnalysisWorkflow = dynamic(
  () => import('../data-analysis/DataAnalysisWorkflow'),
  {
    loading: () => <DataAnalysisLoadingFallback />,
    ssr: false, // Heavy data processing and chart libraries
  }
);

export const LazyPipelinesPage = dynamic(
  () => import('../../pipelines/page'),
  {
    loading: () => <PipelinesLoadingFallback />,
    ssr: false,
  }
);

export const LazyConnectorsPage = dynamic(
  () => import('../../connectors/page'),
  {
    loading: () => <ConnectorsLoadingFallback />,
    ssr: false,
  }
);

export const LazyUsersPage = dynamic(
  () => import('../../users/page'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false,
  }
);

// Note: Authentication is handled by page components (app/login/page.tsx, app/signup/page.tsx)
// These lazy loaded forms are not needed as auth is page-based

// Lazy load heavy modal components
export const LazyDataAnalysisReportModal = dynamic(
  () => import('../data-analysis/DataAnalysisReportModal'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-blue-700 font-medium">Loading Report Generator...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Lazy load AI components
export const LazyAIInsights = dynamic(
  () => import('../ai/AIInsightsManager'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-80 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <h3 className="text-lg font-bold text-purple-900 mb-2">Loading AI Insights</h3>
          <p className="text-purple-700">Initializing machine learning models...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Higher-order component for consistent lazy loading
export const withRouteLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <PageLoadingFallback />
) => {
  const LazyRoute = (props: P) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );

  LazyRoute.displayName = `withRouteLoading(${Component.displayName || Component.name})`;
  
  return LazyRoute;
};

// Route preloading utilities
export const preloadRoute = (routeImporter: () => Promise<any>) => {
  // Preload on idle or user interaction
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        routeImporter();
      });
    } else {
      setTimeout(() => {
        routeImporter();
      }, 1);
    }
  }
};

// Preload critical routes
export const preloadCriticalRoutes = () => {
  if (typeof window !== 'undefined') {
    // Preload dashboard after 2 seconds of idle time
    setTimeout(() => {
      preloadRoute(() => import('../dashboard/MainDashboard'));
    }, 2000);

    // Preload data analysis on user hover/focus
    const preloadDataAnalysis = () => {
      preloadRoute(() => import('../data-analysis/DataAnalysisWorkflow'));
    };

    // Add event listeners for preloading
    document.addEventListener('mouseover', preloadDataAnalysis, { once: true });
    document.addEventListener('focusin', preloadDataAnalysis, { once: true });
  }
};

export {
  PageLoadingFallback,
  DashboardLoadingFallback,
  DataAnalysisLoadingFallback,
  PipelinesLoadingFallback,
  ConnectorsLoadingFallback,
};
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Chart loading fallback
const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-gray-600 font-medium">Loading Chart...</p>
    </div>
  </div>
);

// Heavy chart components loading fallback
const InteractiveChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-blue-700 font-semibold text-lg">Preparing Interactive Chart...</p>
      <p className="text-blue-600 text-sm mt-1">Loading visualization components</p>
    </div>
  </div>
);

// Data analysis loading fallback
const DataAnalysisLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Data Analysis</h3>
      <p className="text-gray-600">Preparing analysis tools and visualizations...</p>
    </div>
  </div>
);

// Lazy load heavy chart components with proper fallbacks
export const LazyInteractiveChart = dynamic(
  () => import('../data-analysis/InteractiveChart'),
  {
    loading: () => <InteractiveChartLoadingFallback />,
    ssr: false, // Disable SSR for chart components
  }
);

export const LazyVisualizationDashboard = dynamic(
  () => import('../data-analysis/VisualizationDashboard'),
  {
    loading: () => <DataAnalysisLoadingFallback />,
    ssr: false,
  }
);

export const LazyInsightsGeneration = dynamic(
  () => import('../data-analysis/InsightsGeneration'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-purple-700 font-medium">Loading AI Insights...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyDataManipulation = dynamic(
  () => import('../data-analysis/DataManipulation'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-48 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-green-700 font-medium">Loading Data Tools...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyExportSystem = dynamic(
  () => import('../data-analysis/ExportSystem'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-32 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-orange-700 font-medium">Loading Export Tools...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Lazy load individual chart types for granular loading
export const LazyBarChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Bar })),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

export const LazyLineChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Line })),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

export const LazyPieChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Pie })),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

export const LazyDoughnutChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

export const LazyScatterChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Scatter })),
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

// Lazy load reports and AI components
export const LazyReportsManager = dynamic(
  () => import('../reports/ReportsManager'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-80 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-700 font-semibold">Loading Reports...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyAIInsightsManager = dynamic(
  () => import('../ai/AIInsightsManager'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-lg border">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-purple-700 font-bold text-lg">Loading AI Insights</p>
          <p className="text-purple-600 text-sm mt-2">Initializing machine learning components...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// Higher-order component for lazy loading with error boundary
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = <ChartLoadingFallback />
) => {
  const LazyComponent = (props: P) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  
  return LazyComponent;
};

// Export loading fallbacks for reuse
export {
  ChartLoadingFallback,
  InteractiveChartLoadingFallback,
  DataAnalysisLoadingFallback,
};
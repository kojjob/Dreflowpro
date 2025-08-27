/**
 * Lazy Import Utilities for Optimal Code Splitting
 * Provides utilities for lazy loading heavy components with proper loading states
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorFallback from '../components/ui/ErrorFallback';

/**
 * Configuration for lazy loading
 */
interface LazyLoadConfig {
  loading?: ComponentType<any>;
  error?: ComponentType<{ error: Error; retry: () => void }>;
  ssr?: boolean;
  suspense?: boolean;
}

/**
 * Default loading component for lazy loaded components
 */
const DefaultLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner />
  </div>
);

/**
 * Create a lazy loaded component with proper error handling
 */
export function createLazyComponent<T = {}>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  config: LazyLoadConfig = {}
) {
  const {
    loading = DefaultLoader,
    error = ErrorFallback,
    ssr = false,
    suspense = false
  } = config;

  return dynamic(importFunc, {
    loading: () => <>{loading({})}</>,
    ssr,
    suspense
  });
}

/**
 * Preload a component to improve perceived performance
 */
export async function preloadComponent(
  importFunc: () => Promise<any>
): Promise<void> {
  try {
    await importFunc();
  } catch (error) {
    console.error('Failed to preload component:', error);
  }
}

/**
 * Create a batch of lazy loaded components
 */
export function createLazyComponents<T extends Record<string, () => Promise<any>>>(
  imports: T,
  config?: LazyLoadConfig
): { [K in keyof T]: ReturnType<typeof createLazyComponent> } {
  const components: any = {};
  
  for (const [name, importFunc] of Object.entries(imports)) {
    components[name] = createLazyComponent(importFunc, config);
  }
  
  return components;
}

/**
 * Lazy load heavy libraries
 */
export const LazyLibraries = {
  // Chart.js lazy loading
  ChartJS: () => createLazyComponent(
    () => import('chart.js').then(mod => ({ default: mod.Chart as any })),
    { ssr: false }
  ),
  
  // PDF generation lazy loading
  jsPDF: () => createLazyComponent(
    () => import('jspdf').then(mod => ({ default: mod.jsPDF as any })),
    { ssr: false }
  ),
  
  // HTML to Canvas lazy loading
  html2canvas: () => createLazyComponent(
    () => import('html2canvas').then(mod => ({ default: mod.default as any })),
    { ssr: false }
  ),
};

/**
 * Route-based code splitting helpers
 */
export const RouteComponents = createLazyComponents({
  // Data Analysis components
  DataAnalysisWorkflow: () => import('../components/data-analysis/DataAnalysisWorkflow'),
  VisualizationDashboard: () => import('../components/data-analysis/VisualizationDashboard'),
  
  // Pipeline components
  PipelineManager: () => import('../components/pipelines/PipelineManagerOptimized'),
  PipelineEditor: () => import('../components/pipelines/PipelineEditor'),
  
  // AI components
  AIInsightsManager: () => import('../components/ai/AIInsightsManager'),
  MLDashboard: () => import('../components/ai/MLDashboard'),
  
  // Report components
  ReportsManager: () => import('../components/reports/ReportsManager'),
  
  // Admin components
  PerformanceDashboard: () => import('../components/admin/PerformanceDashboard'),
  
  // Profile components
  ProfileSettings: () => import('../components/profile/ProfileSettings'),
  BillingSubscription: () => import('../components/profile/BillingSubscription'),
});

/**
 * Preload critical routes based on user navigation patterns
 */
export async function preloadCriticalRoutes() {
  const criticalRoutes = [
    () => import('../components/dashboard/DashboardStatsOptimized'),
    () => import('../components/pipelines/PipelineManagerOptimized'),
  ];
  
  await Promise.all(criticalRoutes.map(preloadComponent));
}

/**
 * Intersection Observer for lazy loading components when they come into viewport
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return;
  
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      onIntersect();
      observer.disconnect();
    }
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });
  
  if (ref.current) {
    observer.observe(ref.current);
  }
  
  return () => observer.disconnect();
}
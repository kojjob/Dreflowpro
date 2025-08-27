'use client';

import { BundlePerformanceMonitor, bundleOptimizer } from "../../utils/bundleOptimization";
import { PerformanceDashboard } from "../performance/PerformanceDashboard";
import { preloadCriticalRoutes } from "../routing/LazyRoutes";
import { useEffect } from "react";

export function ClientProviders() {
  useEffect(() => {
    // Initialize route preloading and bundle optimization on client
    preloadCriticalRoutes();
    bundleOptimizer.preloadCriticalChunks();
  }, []);

  return (
    <>
      <BundlePerformanceMonitor />
      <PerformanceDashboard />
    </>
  );
}
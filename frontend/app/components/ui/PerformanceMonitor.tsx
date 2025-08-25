'use client';

import { useEffect, useState } from 'react';
import Logger from '../../utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [startTime] = useState(performance.now());

  useEffect(() => {
    if (!enabled) return;

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Count DOM elements as a proxy for component complexity
    const componentCount = document.querySelectorAll('*').length;
    
    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize;

    setMetrics({
      renderTime,
      componentCount,
      memoryUsage
    });

    // Log performance metrics
    Logger.log(`🚀 Performance Metrics: ${componentName}`);
    Logger.log(`⏱️ Render Time: ${renderTime.toFixed(2)}ms`);
    Logger.log(`🧩 DOM Elements: ${componentCount}`);
    if (memoryUsage) {
      Logger.log(`💾 Memory Usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Performance warnings
    if (renderTime > 100) {
      Logger.warn(`⚠️ Slow render detected (${renderTime.toFixed(2)}ms)`);
    }
    if (componentCount > 1000) {
      Logger.warn(`⚠️ High DOM complexity (${componentCount} elements)`);
    }
  }, [componentName, enabled, startTime]);

  // Don't render anything in production
  if (!enabled || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg font-mono z-50">
      <div className="font-bold mb-1">{componentName}</div>
      <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
      <div>Elements: {metrics.componentCount}</div>
      {metrics.memoryUsage && (
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      )}
    </div>
  );
};

export default PerformanceMonitor;

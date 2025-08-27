'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { performanceCollector, generatePerformanceReport } from '../../utils/performanceMetrics';
import { combineClasses } from '../../lib/utils';

interface PerformanceReport {
  summary: any;
  recommendations: string[];
  score: number;
}

interface MetricDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  threshold?: number;
  className?: string;
}

const MetricDisplay = React.memo<MetricDisplayProps>(({ label, value, unit = '', threshold, className }) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string);
  const isOverThreshold = threshold && numericValue > threshold;
  
  const displayValue = typeof value === 'number' 
    ? value.toFixed(2) 
    : value;

  return (
    <div className={combineClasses(
      'p-3 rounded-lg border',
      isOverThreshold 
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-green-50 border-green-200 text-green-800',
      className
    )}>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="text-lg font-bold">
        {displayValue}{unit}
        {isOverThreshold && (
          <span className="ml-1 text-red-500 text-sm">⚠️</span>
        )}
      </div>
      {threshold && (
        <div className="text-xs text-gray-500">
          Threshold: {threshold}{unit}
        </div>
      )}
    </div>
  );
});

MetricDisplay.displayName = 'MetricDisplay';

const ScoreGauge = React.memo<{ score: number }>(({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <div className="text-center">
      <div className={combineClasses('text-4xl font-bold', getScoreColor(score))}>
        {Math.round(score)}
      </div>
      <div className="text-sm text-gray-600">
        Performance Score
      </div>
      <div className={combineClasses('text-sm font-medium', getScoreColor(score))}>
        {getScoreLabel(score)}
      </div>
    </div>
  );
});

ScoreGauge.displayName = 'ScoreGauge';

const RecommendationList = React.memo<{ recommendations: string[] }>(({ recommendations }) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-green-600 text-center py-4">
        <span className="text-2xl">🎉</span>
        <p className="mt-2">No recommendations - excellent performance!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recommendations.map((recommendation, index) => (
        <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
          <span className="text-yellow-600 text-sm">💡</span>
          <span className="text-sm text-gray-700">{recommendation}</span>
        </div>
      ))}
    </div>
  );
});

RecommendationList.displayName = 'RecommendationList';

export const PerformanceDashboard = React.memo(() => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshReport = useCallback(() => {
    const newReport = generatePerformanceReport();
    setReport(newReport);
  }, []);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    refreshReport();

    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(refreshReport, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshReport]);

  // Keyboard shortcut to toggle dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Open Performance Dashboard (Ctrl+Shift+P)"
        >
          <span className="text-sm">📊</span>
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed top-4 right-4 bg-white shadow-xl rounded-lg p-4 z-50 max-w-sm">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-white shadow-2xl rounded-lg z-50 max-w-lg max-h-[90vh] overflow-auto border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={combineClasses(
              'px-2 py-1 text-xs rounded',
              autoRefresh
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            )}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
          </button>
          <button
            onClick={refreshReport}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200"
          >
            ↻
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <ScoreGauge score={report.score} />
      </div>

      {/* Web Vitals */}
      {report.summary.webVitals && Object.keys(report.summary.webVitals).length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🚀</span>
            Web Vitals
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {report.summary.webVitals.LCP && (
              <MetricDisplay
                label="LCP"
                value={report.summary.webVitals.LCP}
                unit="ms"
                threshold={2500}
              />
            )}
            {report.summary.webVitals.FID && (
              <MetricDisplay
                label="FID"
                value={report.summary.webVitals.FID}
                unit="ms"
                threshold={100}
              />
            )}
            {report.summary.webVitals.CLS && (
              <MetricDisplay
                label="CLS"
                value={report.summary.webVitals.CLS}
                threshold={0.1}
              />
            )}
            {report.summary.webVitals.FCP && (
              <MetricDisplay
                label="FCP"
                value={report.summary.webVitals.FCP}
                unit="ms"
                threshold={1800}
              />
            )}
          </div>
        </div>
      )}

      {/* Custom Metrics */}
      {report.summary.performance && Object.keys(report.summary.performance).length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-2">⚡</span>
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {report.summary.performance.renderTime && (
              <MetricDisplay
                label="Render Time"
                value={report.summary.performance.renderTime}
                unit="ms"
                threshold={100}
              />
            )}
            {report.summary.performance.apiResponseTime && (
              <MetricDisplay
                label="API Response"
                value={report.summary.performance.apiResponseTime}
                unit="ms"
                threshold={1000}
              />
            )}
            {report.summary.performance.memoryUsage && (
              <MetricDisplay
                label="Memory Usage"
                value={report.summary.performance.memoryUsage}
                unit="MB"
                threshold={50}
              />
            )}
            {report.summary.performance.cacheHitRate && (
              <MetricDisplay
                label="Cache Hit Rate"
                value={(report.summary.performance.cacheHitRate * 100)}
                unit="%"
                threshold={70}
              />
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Recommendations
        </h4>
        <RecommendationList recommendations={report.recommendations} />
      </div>

      {/* Footer */}
      <div className="p-2 bg-gray-50 text-center border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(report.summary.timestamp).toLocaleTimeString()}
        </p>
        <p className="text-xs text-gray-400">
          Press Ctrl+Shift+P to toggle
        </p>
      </div>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

// Hook for easy integration in components
export const usePerformanceDashboard = () => {
  useEffect(() => {
    // Track memory usage periodically
    const interval = setInterval(() => {
      performanceCollector.trackMemoryUsage();
    }, 10000);

    return () => clearInterval(interval);
  }, []);
};

export default PerformanceDashboard;
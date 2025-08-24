'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import {
  Activity,
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Gauge,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';

interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  coreWebVitals: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  };
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  trends: {
    bundleSize: number[];
    loadTime: number[];
    timestamps: string[];
  };
}

const PerformanceDashboard: React.FC = memo(() => {
  // Performance monitoring for this component
  usePerformanceMonitor({ 
    componentName: 'PerformanceDashboard',
    threshold: 100 
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setError(null);
        
        // Simulate fetching real performance metrics
        // In production, this would fetch from your analytics service
        const mockMetrics: PerformanceMetrics = {
          bundleSize: 1.88 * 1024 * 1024, // 1.88MB
          loadTime: 1200, // 1.2s
          renderTime: 45, // 45ms
          memoryUsage: 25.6, // 25.6MB
          coreWebVitals: {
            lcp: 1800, // 1.8s
            fid: 12, // 12ms
            cls: 0.05 // 0.05
          },
          lighthouse: {
            performance: 95,
            accessibility: 98,
            bestPractices: 92,
            seo: 96
          },
          trends: {
            bundleSize: [2.1, 2.0, 1.95, 1.9, 1.88],
            loadTime: [1800, 1600, 1400, 1300, 1200],
            timestamps: ['5d ago', '4d ago', '3d ago', '2d ago', '1d ago']
          }
        };
        
        setMetrics(mockMetrics);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch performance metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getWebVitalStatus = (metric: string, value: number) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (value <= threshold.good) return { status: 'good', color: 'text-green-600' };
    if (value <= threshold.poor) return { status: 'needs-improvement', color: 'text-yellow-600' };
    return { status: 'poor', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span>Error loading performance metrics: {error}</span>
        </div>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time application performance monitoring</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bundle Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(metrics.bundleSize)}</p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                37% reduction
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Load Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.loadTime}ms</p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                33% faster
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Render Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.renderTime}ms</p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Excellent
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.memoryUsage}MB</p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Optimized
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Core Web Vitals */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Core Web Vitals
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="85, 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{metrics.coreWebVitals.lcp}ms</span>
              </div>
            </div>
            <h3 className="font-medium text-gray-900">Largest Contentful Paint</h3>
            <p className={`text-sm ${getWebVitalStatus('lcp', metrics.coreWebVitals.lcp).color}`}>
              {getWebVitalStatus('lcp', metrics.coreWebVitals.lcp).status}
            </p>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="95, 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{metrics.coreWebVitals.fid}ms</span>
              </div>
            </div>
            <h3 className="font-medium text-gray-900">First Input Delay</h3>
            <p className={`text-sm ${getWebVitalStatus('fid', metrics.coreWebVitals.fid).color}`}>
              {getWebVitalStatus('fid', metrics.coreWebVitals.fid).status}
            </p>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="90, 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{metrics.coreWebVitals.cls}</span>
              </div>
            </div>
            <h3 className="font-medium text-gray-900">Cumulative Layout Shift</h3>
            <p className={`text-sm ${getWebVitalStatus('cls', metrics.coreWebVitals.cls).color}`}>
              {getWebVitalStatus('cls', metrics.coreWebVitals.cls).status}
            </p>
          </div>
        </div>
      </Card>

      {/* Lighthouse Scores */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Lighthouse Scores
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.lighthouse).map(([category, score]) => (
            <div key={category} className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getScoreColor(score)}`}>
                {score}
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900 capitalize">
                {category.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Trends */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance Trends
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Bundle Size Trend</span>
              <span className="text-sm text-green-600">↓ 37% reduction</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Load Time Trend</span>
              <span className="text-sm text-green-600">↓ 33% improvement</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;

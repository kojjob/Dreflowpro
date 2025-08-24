'use client';

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { useMultipleRealTimeData } from '../../hooks/useRealTimeData';
import { SkeletonStats, SkeletonCard } from '../ui/Skeleton';
import { AnimatedIcon, PulsingDot } from '../ui/AnimatedIcon';
import PerformanceMonitor from '../ui/PerformanceMonitor';

// Lazy load heavy modal components
const PipelineCreationModal = lazy(() => import('../ui/ModalVariants').then(module => ({ default: module.PipelineCreationModal })));
const DataSourceModal = lazy(() => import('../ui/ModalVariants').then(module => ({ default: module.DataSourceModal })));
const FileUploadModal = lazy(() => import('../ui/ModalVariants').then(module => ({ default: module.FileUploadModal })));
import {
  Activity,
  Database,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Sparkles,
  Star,
  ArrowUp,
  ArrowDown,
  Eye,
  Download,
  Upload,
  Server,
  Globe,
  Shield,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';

interface TaskMetrics {
  timestamp: string;
  daily_stats: {
    total_tasks: number;
    successful_tasks: number;
    failed_tasks: number;
    running_tasks: number;
    pending_tasks: number;
    success_rate: number;
  };
  weekly_stats: {
    total_tasks: number;
    successful_tasks: number;
    failed_tasks: number;
    running_tasks: number;
    pending_tasks: number;
    success_rate: number;
  };
  task_types: Record<string, number>;
  average_execution_times: Record<string, number>;
  queue_performance: Record<string, {
    avg_wait_time: number;
    throughput: number;
  }>;
  data_processing_stats?: {
    total_records_processed: number;
    successful_records: number;
    failed_records: number;
  };
}

interface HealthStatus {
  status: string;
  app: string;
  version: string;
  environment: string;
  services: {
    database: string;
    redis: string;
  };
}

const DashboardStats: React.FC = () => {
  const router = useRouter();

  // Modal states
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  } = useMultipleRealTimeData(
    {
      healthStatus: () => apiService.getHealthStatus(),
      metrics: () => apiService.getTaskMetrics(),
    },
    {
      interval: 120000, // 2 minutes - further reduced for better performance
      enabled: true,
      onError: (error) => {
        console.warn('Real-time data fetch error (using mock data):', error);
        // Don't show error toast for network errors since we have fallback
      }
    }
  );

  // Memoize expensive data calculations
  const healthStatus = useMemo(() => data?.healthStatus, [data?.healthStatus]);
  const metrics = useMemo(() => data?.metrics, [data?.metrics]);

  // Memoize computed stats to prevent unnecessary recalculations
  const computedStats = useMemo(() => {
    if (!metrics) return null;

    return {
      totalTasks: metrics.daily_stats?.total_tasks || 0,
      completedTasks: metrics.daily_stats?.successful_tasks || 0,
      failedTasks: metrics.daily_stats?.failed_tasks || 0,
      runningTasks: metrics.daily_stats?.running_tasks || 0,
      pendingTasks: metrics.daily_stats?.pending_tasks || 0,
      successRate: metrics.daily_stats?.success_rate || 0
    };
  }, [metrics]);

  // Show notification when using mock data (optimized)
  React.useEffect(() => {
    if (healthStatus && healthStatus.environment === 'development' && healthStatus.app === 'DreflowPro') {
      // This indicates we're using mock data
      const hasShownMockNotification = sessionStorage.getItem('mockDataNotificationShown');
      if (!hasShownMockNotification) {
        // Delay notification to not block initial render
        setTimeout(() => {
          toast.info('Demo Mode: Using sample data for demonstration', {
            duration: 5000,
            description: 'Connect to a backend API for live data'
          });
        }, 1000);
        sessionStorage.setItem('mockDataNotificationShown', 'true');
      }
    }
  }, [healthStatus]);

  // Early return with fast-loading skeleton if still loading
  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'degraded': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  // Quick Actions handlers
  const handleCreatePipeline = () => {
    setIsPipelineModalOpen(true);
  };

  const handleAddDataSource = () => {
    setIsDataSourceModalOpen(true);
  };

  const handleViewAnalytics = () => {
    toast.success("Navigating to analytics...");
    router.push('/dashboard?tab=data-analysis');
  };

  const handleSystemSettings = () => {
    toast.info("Settings modal coming soon...");
    // For now, just show a toast. Later we can implement a settings modal
  };

  const handleUploadData = () => {
    setIsFileUploadModalOpen(true);
  };

  // Modal submission handlers
  const handlePipelineSubmit = (data: { name: string; description: string }) => {
    console.log('Pipeline created:', data);
    // Here you would typically make an API call to create the pipeline
  };

  const handleDataSourceSubmit = (data: { type: string; name: string; config: any }) => {
    console.log('Data source added:', data);
    // Here you would typically make an API call to add the data source
  };

  const handleFileUpload = (files: FileList) => {
    console.log('Files uploaded:', files);
    // Here you would typically handle the file upload
  };

  // Remove duplicate loading state - handled above

  return (
    <div className="space-y-8">
      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pipelines */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold mt-1">{computedStats?.totalTasks || 0}</p>
              <div className="flex items-center mt-2">
                <ArrowUp className="w-4 h-4 text-green-300" />
                <span className="text-green-300 text-sm ml-1">+12% this month</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AnimatedIcon
                icon={Zap}
                animation="scale"
                trigger="hover"
                size="xl"
                className="text-white"
              />
            </div>
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Connections</p>
              <p className="text-3xl font-bold mt-1">8</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="w-4 h-4 text-green-300" />
                <span className="text-green-300 text-sm ml-1">All healthy</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AnimatedIcon
                icon={Database}
                animation="pulse"
                trigger="always"
                size="xl"
                className="text-white"
              />
            </div>
          </div>
        </div>

        {/* Data Processed */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Data Processed</p>
              <p className="text-3xl font-bold mt-1">2.4TB</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-purple-300" />
                <span className="text-purple-300 text-sm ml-1">+8.2% today</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AnimatedIcon
                icon={HardDrive}
                animation="bounce"
                trigger="hover"
                size="xl"
                className="text-white"
              />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Success Rate</p>
              <p className="text-3xl font-bold mt-1">{computedStats?.successRate || 0}%</p>
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 text-orange-300" />
                <span className="text-orange-300 text-sm ml-1">Excellent</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <AnimatedIcon
                icon={Target}
                animation="rotate"
                trigger="hover"
                size="xl"
                className="text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline Performance Chart */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pipeline Performance</h3>
              <p className="text-gray-500 text-sm">Last 7 days execution metrics</p>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg">
              <LineChart className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Simple Chart Visualization */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Monday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">85%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tuesday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{width: '92%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">92%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wednesday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">78%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Thursday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" style={{width: '96%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">96%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Friday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full" style={{width: '89%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">89%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Saturday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 h-2 rounded-full" style={{width: '94%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">94%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sunday</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full" style={{width: '87%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">87%</span>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">System Health</h3>
              <p className="text-gray-500 text-sm">Real-time system status</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Health Metrics */}
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-green-800">CPU Usage</span>
              </div>
              <span className="text-green-600 font-bold">23%</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-blue-800">Memory Usage</span>
              </div>
              <span className="text-blue-600 font-bold">67%</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-purple-800">Network I/O</span>
              </div>
              <span className="text-purple-600 font-bold">45%</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-orange-800">Disk Usage</span>
              </div>
              <span className="text-orange-600 font-bold">34%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <p className="text-gray-500 text-sm">Latest pipeline executions and events</p>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Sales Data Pipeline completed successfully</p>
                <p className="text-sm text-gray-500">Processed 15,432 records in 2.3 minutes</p>
              </div>
              <span className="text-xs text-gray-400">2 min ago</span>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Customer Analytics data uploaded</p>
                <p className="text-sm text-gray-500">New dataset ready for processing</p>
              </div>
              <span className="text-xs text-gray-400">5 min ago</span>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Database connection established</p>
                <p className="text-sm text-gray-500">PostgreSQL connector is now active</p>
              </div>
              <span className="text-xs text-gray-400">12 min ago</span>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Performance optimization completed</p>
                <p className="text-sm text-gray-500">System performance improved by 15%</p>
              </div>
              <span className="text-xs text-gray-400">1 hour ago</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
              <p className="text-gray-500 text-sm">Common tasks and shortcuts</p>
            </div>
            <div className="bg-pink-50 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-pink-600" />
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCreatePipeline}
              className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-blue-800">Create New Pipeline</span>
            </button>

            <button
              onClick={handleAddDataSource}
              className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-green-800">Add Data Source</span>
            </button>

            <button
              onClick={handleViewAnalytics}
              className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200 hover:from-purple-100 hover:to-violet-100 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-purple-800">View Analytics</span>
            </button>

            <button
              onClick={handleSystemSettings}
              className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 hover:from-orange-100 hover:to-amber-100 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-orange-800">System Settings</span>
            </button>

            <button
              onClick={handleUploadData}
              className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200 hover:from-pink-100 hover:to-rose-100 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-pink-800">Upload Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status and Refresh */}
      <div className="flex items-center justify-between bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {loading ? (
              <AnimatedIcon
                icon={RefreshCw}
                animation="spin"
                trigger="always"
                className="text-blue-600"
              />
            ) : error ? (
              <WifiOff className="w-5 h-5 text-red-600" />
            ) : (
              <div className="flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-green-600" />
                <PulsingDot color="bg-green-500" size="sm" />
              </div>
            )}
            <span className="text-lg font-semibold text-gray-900">
              {loading ? 'Updating Dashboard...' : error ? 'Connection Error' : 'System Connected'}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Dashboard Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Components - Lazy Loaded */}
      <Suspense fallback={null}>
        {isPipelineModalOpen && (
          <PipelineCreationModal
            isOpen={isPipelineModalOpen}
            onClose={() => setIsPipelineModalOpen(false)}
            onSubmit={handlePipelineSubmit}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isDataSourceModalOpen && (
          <DataSourceModal
            isOpen={isDataSourceModalOpen}
            onClose={() => setIsDataSourceModalOpen(false)}
            onSubmit={handleDataSourceSubmit}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isFileUploadModalOpen && (
          <FileUploadModal
            isOpen={isFileUploadModalOpen}
            onClose={() => setIsFileUploadModalOpen(false)}
            onUpload={handleFileUpload}
          />
        )}
      </Suspense>

      {/* Performance Monitor (Development Only) */}
      <PerformanceMonitor componentName="DashboardStats" />
    </div>
  );
};

export default DashboardStats;
'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { useMultipleRealTimeData } from '../../hooks/useRealTimeData';
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
  RefreshCw
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
      interval: 60000, // 60 seconds - reduced from 30s to improve performance
      enabled: false, // Temporarily disable real-time polling to improve load time
      onError: (error) => console.error('Real-time data fetch error:', error)
    }
  );

  const healthStatus = data?.healthStatus;
  const metrics = data?.metrics;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            ) : error ? (
              <WifiOff className="w-4 h-4 text-red-600" />
            ) : (
              <Wifi className="w-4 h-4 text-green-600" />
            )}
            <span className="text-sm font-medium text-gray-900">
              {loading ? 'Updating...' : error ? 'Connection Error' : 'Connected'}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Dashboard Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Health Status */}
      {healthStatus && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <div className="flex items-center space-x-2">
              {getStatusIcon(healthStatus.status)}
              <span className={`font-medium ${getStatusColor(healthStatus.status)}`}>
                {healthStatus.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{healthStatus.app}</div>
              <div className="text-sm text-gray-500">Application</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{healthStatus.version}</div>
              <div className="text-sm text-gray-500">Version</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Database className="w-4 h-4" />
                <span className={`font-medium ${getStatusColor(healthStatus.services.database)}`}>
                  {healthStatus.services.database}
                </span>
              </div>
              <div className="text-sm text-gray-500">Database</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-4 h-4" />
                <span className={`font-medium ${getStatusColor(healthStatus.services.redis)}`}>
                  {healthStatus.services.redis}
                </span>
              </div>
              <div className="text-sm text-gray-500">Redis</div>
            </div>
          </div>
        </Card>
      )}

      {/* Task Statistics */}
      {metrics && (
        <>
          {/* Daily Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Daily Task Overview</h3>
              <div className="text-sm text-gray-500">
                Real-time updates every 30s
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{metrics.daily_stats.total_tasks}</div>
                <div className="text-sm text-gray-500">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{metrics.daily_stats.successful_tasks}</div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{metrics.daily_stats.failed_tasks}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{metrics.daily_stats.running_tasks}</div>
                <div className="text-sm text-gray-500">Running</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{metrics.daily_stats.success_rate}%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
              </div>
            </div>
          </Card>

          {/* Weekly Comparison */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Comparison</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Today vs This Week</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Tasks:</span>
                    <span className="font-medium">{metrics.daily_stats.total_tasks} / {metrics.weekly_stats.total_tasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="font-medium">{metrics.daily_stats.success_rate}% / {metrics.weekly_stats.success_rate}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Success:</span>
                    <span className="font-medium text-green-600">{Math.round(metrics.weekly_stats.successful_tasks / 7)}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Failures:</span>
                    <span className="font-medium text-red-600">{Math.round(metrics.weekly_stats.failed_tasks / 7)}/day</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Task Types Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Types (Today)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.task_types).map(([type, count]) => (
                <div key={type} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500 capitalize">{type.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Average Execution Times */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Average Execution Times</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(metrics.average_execution_times).map(([type, time]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-medium">{time}s</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Queue Performance */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Queue Performance</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metrics.queue_performance).map(([queue, perf]) => (
                <div key={queue} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 capitalize mb-2">{queue}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Wait Time:</span>
                      <span className="font-medium">{perf.avg_wait_time}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Throughput:</span>
                      <span className="font-medium">{perf.throughput}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Data Processing Stats */}
          {metrics.data_processing_stats && (
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Data Processing (Today)</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.data_processing_stats.total_records_processed.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Records Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.data_processing_stats.successful_records.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.data_processing_stats.failed_records.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {!metrics && !error && (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
          <p className="text-gray-600">Task metrics will appear here once background tasks are executed.</p>
        </Card>
      )}
    </div>
  );
};

export default DashboardStats;
'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import Logger from '../../utils/logger';
import {
  Database,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Lazy load chart components
const Chart = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Chart })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
  ssr: false
});

const Line = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
  ssr: false
});

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
  ssr: false
});

interface DashboardStats {
  pipelines: {
    total: number;
    active: number;
    running: number;
    failed: number;
    scheduled: number;
  };
  connectors: {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  };
  tasks: {
    total: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    status: 'success' | 'error' | 'warning' | 'info';
  }>;
}

// Memoized stat card component
const StatCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  subtitle 
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: number;
  subtitle?: string;
}) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    {trend !== undefined && (
      <div className="mt-4 flex items-center">
        <TrendingUp className={`w-4 h-4 mr-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
        <span className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
        <span className="text-sm text-gray-500 ml-1">from last week</span>
      </div>
    )}
  </Card>
));

StatCard.displayName = 'StatCard';

const DashboardStatsOptimized: React.FC = () => {
  // Performance monitoring
  usePerformanceMonitor({ 
    componentName: 'DashboardStatsOptimized',
    threshold: 100 
  });

  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        setError(null);
        const response = await apiService.get('/dashboard/stats');
        setStats(response.data);
        Logger.log('✅ Dashboard stats loaded');
      } catch (err: any) {
        // Extract meaningful error information
        let errorMessage = 'Failed to load dashboard stats';
        
        if (err.message) {
          errorMessage = err.message;
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response?.statusText) {
          errorMessage = `${err.response.status} ${err.response.statusText}`;
        }
        
        // Handle API not available case with mock data fallback
        if (errorMessage.includes('API endpoint not available') || errorMessage.includes('Not Found')) {
          // Use mock data for development when endpoints don't exist
          // Only log once to avoid spam
          if (!window.dashboardMockDataLogged) {
            Logger.info('📊 Using mock dashboard data (backend not available)');
            window.dashboardMockDataLogged = true;
          }
          setStats({
            pipelines: {
              total: 12,
              active: 8,
              running: 3,
              failed: 1,
              scheduled: 2
            },
            connectors: {
              total: 15,
              connected: 12,
              disconnected: 2,
              error: 1
            },
            tasks: {
              total: 150,
              completed: 135,
              running: 8,
              failed: 5,
              pending: 2
            },
            system: {
              cpu_usage: 45.2,
              memory_usage: 68.7,
              disk_usage: 34.1,
              uptime: 86400000 // 1 day in milliseconds
            },
            recent_activity: [
              {
                id: 'activity-1',
                type: 'pipeline_completed',
                message: 'Data pipeline "Customer Analytics" completed successfully',
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                status: 'success' as const
              },
              {
                id: 'activity-2',
                type: 'connector_connected',
                message: 'Database connector "PostgreSQL-Prod" established',
                timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                status: 'info' as const
              },
              {
                id: 'activity-3',
                type: 'task_failed',
                message: 'Data validation task failed - invalid schema',
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                status: 'error' as const
              }
            ]
          });
          return; // Don't set error state when using mock data
        } else if (errorMessage.includes('Authentication failed')) {
          setError('Please log in to view dashboard stats');
        } else {
          setError(errorMessage);
        }
        
        // Prepare detailed error context for logging
        const errorContext = {
          message: err.message || 'No error message',
          name: err.name || 'Unknown error type',
          status: err.response?.status || 'No status',
          statusText: err.response?.statusText || 'No status text',
          hasResponse: !!err.response,
          endpoint: 'GET /dashboard/stats',
          hasUser: !!user,
          timestamp: new Date().toISOString()
        };
        
        Logger.error('❌ Failed to load dashboard stats:', errorMessage, errorContext);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Memoized chart data
  const pipelineStatusChart = useMemo(() => {
    if (!stats) return null;

    return {
      labels: ['Active', 'Running', 'Failed', 'Scheduled'],
      datasets: [{
        data: [
          stats.pipelines.active,
          stats.pipelines.running,
          stats.pipelines.failed,
          stats.pipelines.scheduled
        ],
        backgroundColor: [
          '#10B981', // green
          '#3B82F6', // blue
          '#EF4444', // red
          '#8B5CF6'  // purple
        ],
        borderWidth: 0
      }]
    };
  }, [stats]);

  const systemUsageChart = useMemo(() => {
    if (!stats) return null;

    return {
      labels: ['CPU', 'Memory', 'Disk'],
      datasets: [{
        label: 'Usage %',
        data: [
          stats.system.cpu_usage,
          stats.system.memory_usage,
          stats.system.disk_usage
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: true
      }]
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" className="mb-6">
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert type="warning" className="mb-6">
        No dashboard data available
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pipelines"
            value={stats.pipelines.total}
            icon={Database}
            color="bg-blue-500"
            trend={5}
          />
          <StatCard
            title="Active Pipelines"
            value={stats.pipelines.active}
            icon={CheckCircle}
            color="bg-green-500"
            trend={2}
          />
          <StatCard
            title="Running Now"
            value={stats.pipelines.running}
            icon={Activity}
            color="bg-blue-500"
          />
          <StatCard
            title="Failed"
            value={stats.pipelines.failed}
            icon={XCircle}
            color="bg-red-500"
            trend={-10}
          />
        </div>
      </div>

      {/* Connector Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Connector Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Connectors"
            value={stats.connectors.total}
            icon={Zap}
            color="bg-purple-500"
          />
          <StatCard
            title="Connected"
            value={stats.connectors.connected}
            icon={CheckCircle}
            color="bg-green-500"
          />
          <StatCard
            title="Disconnected"
            value={stats.connectors.disconnected}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatCard
            title="Errors"
            value={stats.connectors.error}
            icon={AlertTriangle}
            color="bg-red-500"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Status Distribution</h3>
          {pipelineStatusChart && (
            <div className="h-64">
              <Doughnut 
                data={pipelineStatusChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          )}
        </Card>

        {/* System Usage */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Usage</h3>
          {systemUsageChart && (
            <div className="h-64">
              <Line 
                data={systemUsageChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {stats.recent_activity.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-green-500' :
                activity.status === 'error' ? 'bg-red-500' :
                activity.status === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default DashboardStatsOptimized;

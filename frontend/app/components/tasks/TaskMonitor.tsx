'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { useMultipleRealTimeData } from '../../hooks/useRealTimeData';
import { toast } from 'sonner';
import Logger from '../../utils/logger';
import { 
  Play, 
  Pause, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Server,
  Database,
  FileText,
  Filter,
  Download,
  Eye
} from 'lucide-react';

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration: number | null;
  progress: number;
  result: any;
  error_message: string | null;
  user_id: string;
  metadata: {
    priority?: number;
    queue?: string;
    retry_count?: number;
    max_retries?: number;
  };
}

interface TaskQueue {
  name: string;
  size: number;
  active: number;
  processed: number;
  failed: number;
  delayed: number;
}

interface TaskLogs {
  task_id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
}

const TaskMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [queues, setQueues] = useState<TaskQueue[]>([]);
  const [taskLogs, setTaskLogs] = useState<Record<string, TaskLogs[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchTaskData = async () => {
    try {
      setError(null);
      
      // Fetch tasks, queue status, and task history in parallel
      const [taskHistory, queueStatus] = await Promise.allSettled([
        apiService.getTaskHistory({ limit: 100, status: statusFilter !== 'all' ? statusFilter : undefined }),
        apiService.getTaskQueue(),
      ]);

      if (taskHistory.status === 'fulfilled') {
        // Ensure we always get an array
        let filteredTasks = [];

        if (Array.isArray(taskHistory.value)) {
          filteredTasks = taskHistory.value;
        } else if (Array.isArray(taskHistory.value.tasks)) {
          filteredTasks = taskHistory.value.tasks;
        } else if (taskHistory.value.data && Array.isArray(taskHistory.value.data.tasks)) {
          filteredTasks = taskHistory.value.data.tasks;
        }

        // Apply type filter
        if (typeFilter !== 'all' && Array.isArray(filteredTasks)) {
          filteredTasks = filteredTasks.filter((task: Task) => task.type === typeFilter);
        }

        // Ensure we always set an array
        setTasks(Array.isArray(filteredTasks) ? filteredTasks : []);
      }

      if (queueStatus.status === 'fulfilled') {
        setQueues(queueStatus.value.queues || []);
      }

    } catch (err: any) {
      Logger.error('Task data fetch error:', err);
      
      // Handle different error types gracefully
      const errorMessage = err.message || 'Failed to load task data';
      
      if (errorMessage.includes('API endpoint not available') || errorMessage.includes('Not Found')) {
        // Use mock data for development when endpoints don't exist
        Logger.warn('📋 Task endpoints not available, using mock data');
        setTasks([
          {
            id: 'mock-1',
            status: 'completed',
            task_type: 'data_pipeline',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
            task_name: 'CSV Processing Pipeline',
            progress: 100,
            error_message: null,
            user_id: 'mock-user',
            metadata: { priority: 1 }
          },
          {
            id: 'mock-2',
            status: 'running',
            task_type: 'data_processing',
            created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 30 * 1000).toISOString(),
            task_name: 'Data Transformation',
            progress: 65,
            error_message: null,
            user_id: 'mock-user',
            metadata: { priority: 2 }
          }
        ]);
        setQueues([
          { name: 'default', size: 3, processing: 1 },
          { name: 'high_priority', size: 1, processing: 1 }
        ]);
        setError(null);
      } else if (errorMessage.includes('Authentication failed')) {
        setError('Please log in to view task data');
      } else {
        setError('Failed to load task data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskLogs = async (taskId: string) => {
    try {
      const logs = await apiService.getTaskLogs(taskId);
      setTaskLogs(prev => ({
        ...prev,
        [taskId]: logs
      }));
    } catch (err) {
      Logger.error('Task logs fetch error:', err);
      toast.error('Failed to load task logs');
    }
  };

  // Task action handlers
  const handleRetryTask = async (taskId: string) => {
    try {
      await apiService.retryTask(taskId);
      toast.success('Task retry initiated');
      refetch(); // Refresh data immediately
    } catch (err) {
      Logger.error('Task retry error:', err);
      toast.error('Failed to retry task');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await apiService.cancelTask(taskId);
      toast.success('Task cancelled successfully');
      refetch(); // Refresh data immediately
    } catch (err) {
      Logger.error('Task cancel error:', err);
      toast.error('Failed to cancel task');
    }
  };

  const handleViewLogs = (taskId: string) => {
    setSelectedTask(taskId);
    fetchTaskLogs(taskId);
  };

  // Real-time data fetching
  const { 
    data: realTimeData, 
    loading: realTimeLoading, 
    error: realTimeError, 
    refetch 
  } = useMultipleRealTimeData(
    {
      taskHistory: () => apiService.getTaskHistory({ 
        limit: 100, 
        status: statusFilter !== 'all' ? statusFilter : undefined 
      }),
    },
    {
      interval: 30000, // 30 seconds - reduced frequency to improve performance
      enabled: true,
      onError: (error) => {
        Logger.error('Real-time task data fetch error:', error);
        toast.error('Failed to update task data');
      }
    }
  );

  // Process real-time data
  useEffect(() => {
    if (realTimeData?.taskHistory) {
      // Ensure we always get an array
      let filteredTasks = [];

      if (Array.isArray(realTimeData.taskHistory)) {
        filteredTasks = realTimeData.taskHistory;
      } else if (Array.isArray(realTimeData.taskHistory.tasks)) {
        filteredTasks = realTimeData.taskHistory.tasks;
      } else if (realTimeData.taskHistory.data && Array.isArray(realTimeData.taskHistory.data.tasks)) {
        filteredTasks = realTimeData.taskHistory.data.tasks;
      }

      // Apply type filter
      if (typeFilter !== 'all' && Array.isArray(filteredTasks)) {
        filteredTasks = filteredTasks.filter((task: Task) => task.type === typeFilter);
      }

      // Ensure we always set an array
      setTasks(Array.isArray(filteredTasks) ? filteredTasks : []);
    }

    if (realTimeData?.queueStatus) {
      setQueues(realTimeData.queueStatus.queues || []);
    }
  }, [realTimeData, typeFilter]);

  // Legacy fallback
  useEffect(() => {
    if (!realTimeData) {
      fetchTaskData();
    }
  }, [statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'running':
        return <Activity className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <Pause className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pipeline':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'dataprocessing':
        return <Server className="w-4 h-4 text-green-600" />;
      case 'reportgeneration':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'maintenance':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      case 'notification':
        return <AlertCircle className="w-4 h-4 text-pink-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A';
    
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Legacy functions removed - using the new handlers above

  // Ensure tasks is always an array before mapping
  const taskTypes = Array.isArray(tasks) ? [...new Set(tasks.map(task => task.type))] : [];

  // Use real-time loading state for initial load
  const isInitialLoading = loading && !realTimeData;
  const currentError = error || realTimeError;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading task monitor..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time connection status */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {realTimeLoading ? (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            ) : currentError ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            <span className="text-sm font-medium text-gray-900">
              {realTimeLoading ? 'Refreshing...' : currentError ? 'Connection Issues' : 'Live Monitoring'}
            </span>
          </div>
          <span className="text-xs text-gray-500">Updates every 10s</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={realTimeLoading}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${realTimeLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {currentError && (
        <Alert variant="destructive">
          <AlertTitle>Task Monitor Error</AlertTitle>
          <AlertDescription>{currentError}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Monitor</h2>
          <p className="text-gray-600">Monitor and manage background task execution</p>
        </div>
        <button
          onClick={fetchTaskData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Queue Overview */}
      {queues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {queues.map((queue) => (
            <Card key={queue.name} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 capitalize">{queue.name}</h3>
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-lg font-bold text-blue-600">{queue.active}</div>
                  <div className="text-gray-500">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{queue.size}</div>
                  <div className="text-gray-500">Queued</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{queue.processed}</div>
                  <div className="text-gray-500">Processed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{queue.failed}</div>
                  <div className="text-gray-500">Failed</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="all">All Types</option>
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Task List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
        </div>
        
        {Array.isArray(tasks) && tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(task.type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {task.type}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {task.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        <span className="ml-1">{task.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.progress}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(task.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedTask(selectedTask === task.id ? null : task.id);
                            if (selectedTask !== task.id) {
                              fetchTaskLogs(task.id);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {task.status === 'failed' && (
                          <button
                            onClick={() => handleRetryTask(task.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {task.status === 'running' && (
                          <button
                            onClick={() => handleCancelTask(task.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600">No tasks match your current filters.</p>
          </div>
        )}
      </Card>

      {/* Task Details */}
      {selectedTask && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {(() => {
            const task = Array.isArray(tasks) ? tasks.find(t => t.id === selectedTask) : null;
            if (!task) return null;
            
            return (
              <div className="space-y-4">
                {/* Task Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Task ID</label>
                    <div className="text-sm text-gray-900 font-mono">{task.id}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <div className="text-sm text-gray-900">{task.type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Queue</label>
                    <div className="text-sm text-gray-900">{task.metadata.queue || 'default'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <div className="text-sm text-gray-900">{task.metadata.priority || 0}</div>
                  </div>
                </div>

                {/* Error Message */}
                {task.error_message && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Error Message</label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {task.error_message}
                    </div>
                  </div>
                )}

                {/* Task Result */}
                {task.result && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Result</label>
                    <pre className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 overflow-auto">
                      {JSON.stringify(task.result, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Task Logs */}
                {taskLogs[selectedTask] && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Logs</label>
                    <div className="mt-1 p-3 bg-gray-900 text-white rounded text-sm font-mono max-h-64 overflow-auto">
                      {taskLogs[selectedTask].map((log, index) => (
                        <div key={index} className="flex space-x-2">
                          <span className="text-gray-400">{log.timestamp}</span>
                          <span className={`font-medium ${
                            log.level === 'ERROR' ? 'text-red-400' :
                            log.level === 'WARNING' ? 'text-yellow-400' :
                            log.level === 'INFO' ? 'text-green-400' : 'text-blue-400'
                          }`}>
                            [{log.level}]
                          </span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
};

export default TaskMonitor;
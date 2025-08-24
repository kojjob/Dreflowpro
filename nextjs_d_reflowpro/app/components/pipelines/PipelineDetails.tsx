'use client';

import React, { useState, useEffect, memo } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { apiService } from '../../services/api';
import Logger from '../../utils/logger';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import {
  Play,
  StopCircle,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  ArrowRight,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'inactive' | 'running' | 'error';
  created_at: string;
  updated_at: string;
  is_scheduled: boolean;
  schedule_cron?: string;
  next_run?: string;
  pipeline_config?: {
    steps?: Array<{
      id: string;
      step_order: number;
      step_type: 'source' | 'transform' | 'destination';
      step_name: string;
      step_config: Record<string, any>;
    }>;
  };
}

interface PipelineDetailsProps {
  pipeline: Pipeline;
  onEdit: () => void;
  onBack: () => void;
}

interface ExecutionHistory {
  id: string;
  status: 'success' | 'failed' | 'running';
  started_at: string;
  completed_at?: string;
  duration?: number;
  error_message?: string;
}

const PipelineDetails: React.FC<PipelineDetailsProps> = memo(({
  pipeline,
  onEdit,
  onBack
}) => {
  // Performance monitoring
  usePerformanceMonitor({ 
    componentName: 'PipelineDetails',
    threshold: 100 
  });

  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch execution history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setError(null);
        const response = await apiService.get(`/pipelines/${pipeline.id}/executions`);
        setExecutionHistory(response.data || []);
        Logger.log('✅ Pipeline execution history loaded');
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to load execution history';
        setError(errorMessage);
        Logger.error('❌ Failed to load execution history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [pipeline.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'inactive':
        return <StopCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{pipeline.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pipeline.status)}`}>
                {pipeline.status}
              </span>
            </div>
            <p className="text-gray-600 mb-4">{pipeline.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Created: {new Date(pipeline.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Updated: {new Date(pipeline.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Steps: {pipeline.pipeline_config?.steps?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Scheduling Info */}
        {pipeline.is_scheduled && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Scheduled Pipeline</span>
            </div>
            <div className="text-sm text-blue-700">
              <p>Cron: <code className="bg-blue-100 px-2 py-1 rounded">{pipeline.schedule_cron}</code></p>
              {pipeline.next_run && (
                <p className="mt-1">Next run: {new Date(pipeline.next_run).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Pipeline Steps */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Steps</h2>
        
        {pipeline.pipeline_config?.steps && pipeline.pipeline_config.steps.length > 0 ? (
          <div className="space-y-4">
            {pipeline.pipeline_config.steps
              .sort((a, b) => a.step_order - b.step_order)
              .map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{step.step_order}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{step.step_name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        step.step_type === 'source' ? 'bg-green-100 text-green-800' :
                        step.step_type === 'transform' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {step.step_type}
                      </span>
                    </div>
                    
                    {Object.keys(step.step_config).length > 0 && (
                      <div className="text-sm text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="hover:text-gray-800">Configuration</summary>
                          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                            {JSON.stringify(step.step_config, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                  
                  {index < pipeline.pipeline_config.steps.length - 1 && (
                    <div className="flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No steps configured</p>
            <p className="text-sm">Edit this pipeline to add steps</p>
          </div>
        )}
      </Card>

      {/* Execution History */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Execution History</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <Alert type="error">{error}</Alert>
        ) : executionHistory.length > 0 ? (
          <div className="space-y-3">
            {executionHistory.slice(0, 10).map((execution) => (
              <div key={execution.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    execution.status === 'success' ? 'bg-green-500' :
                    execution.status === 'failed' ? 'bg-red-500' :
                    'bg-blue-500 animate-pulse'
                  }`} />
                  
                  <div>
                    <div className="font-medium text-gray-900 capitalize">{execution.status}</div>
                    <div className="text-sm text-gray-600">
                      Started: {new Date(execution.started_at).toLocaleString()}
                    </div>
                    {execution.error_message && (
                      <div className="text-sm text-red-600 mt-1">{execution.error_message}</div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-600">
                  {execution.completed_at && execution.duration && (
                    <div>Duration: {formatDuration(execution.duration)}</div>
                  )}
                  {execution.completed_at && (
                    <div>Completed: {new Date(execution.completed_at).toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No execution history</p>
            <p className="text-sm">This pipeline hasn't been run yet</p>
          </div>
        )}
      </Card>
    </div>
  );
});

PipelineDetails.displayName = 'PipelineDetails';

export default PipelineDetails;

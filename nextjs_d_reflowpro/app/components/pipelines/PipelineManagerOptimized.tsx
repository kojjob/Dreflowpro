'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import Logger from '../../utils/logger';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { Plus, RefreshCw } from 'lucide-react';

// Lazy load heavy components
const PipelineList = dynamic(() => import('./PipelineList'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const PipelineEditor = dynamic(() => import('./PipelineEditor'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const PipelineDetails = dynamic(() => import('./PipelineDetails'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

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

const PipelineManagerOptimized: React.FC = () => {
  // Performance monitoring
  usePerformanceMonitor({ 
    componentName: 'PipelineManagerOptimized',
    threshold: 100 
  });

  const { user } = useAuth();
  
  // State management
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI state
  const [activeView, setActiveView] = useState<'list' | 'create' | 'edit' | 'details'>('list');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Memoized API calls
  const fetchPipelines = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.get('/pipelines');
      setPipelines(response.data || []);
      Logger.log('✅ Pipelines loaded:', response.data?.length || 0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load pipelines';
      setError(errorMessage);
      Logger.error('❌ Failed to load pipelines:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user, fetchPipelines]);

  // Memoized handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPipelines();
  }, [fetchPipelines]);

  const handleRunPipeline = useCallback(async (pipelineId: string) => {
    try {
      await apiService.post(`/pipelines/${pipelineId}/run`);
      Logger.log('✅ Pipeline started:', pipelineId);
      await fetchPipelines(); // Refresh to get updated status
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to run pipeline';
      setError(errorMessage);
      Logger.error('❌ Failed to run pipeline:', err);
    }
  }, [fetchPipelines]);

  const handleStopPipeline = useCallback(async (pipelineId: string) => {
    try {
      await apiService.post(`/pipelines/${pipelineId}/stop`);
      Logger.log('✅ Pipeline stopped:', pipelineId);
      await fetchPipelines(); // Refresh to get updated status
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to stop pipeline';
      setError(errorMessage);
      Logger.error('❌ Failed to stop pipeline:', err);
    }
  }, [fetchPipelines]);

  const handleEditPipeline = useCallback((pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setActiveView('edit');
  }, []);

  const handleDeletePipeline = useCallback(async (pipelineId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;
    
    try {
      await apiService.delete(`/pipelines/${pipelineId}`);
      Logger.log('✅ Pipeline deleted:', pipelineId);
      await fetchPipelines(); // Refresh list
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete pipeline';
      setError(errorMessage);
      Logger.error('❌ Failed to delete pipeline:', err);
    }
  }, [fetchPipelines]);

  const handleViewDetails = useCallback((pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setActiveView('details');
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedPipeline(null);
    setActiveView('create');
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveView('list');
    setSelectedPipeline(null);
  }, []);

  const handleSortChange = useCallback((field: string) => {
    if (field === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Memoized pipeline statistics
  const pipelineStats = useMemo(() => {
    return {
      total: pipelines.length,
      active: pipelines.filter(p => p.status === 'active').length,
      running: pipelines.filter(p => p.status === 'running').length,
      error: pipelines.filter(p => p.status === 'error').length,
      scheduled: pipelines.filter(p => p.is_scheduled).length,
    };
  }, [pipelines]);

  // Render different views
  const renderContent = () => {
    switch (activeView) {
      case 'create':
      case 'edit':
        return (
          <PipelineEditor
            pipeline={selectedPipeline}
            onSave={async () => {
              await fetchPipelines();
              handleBackToList();
            }}
            onCancel={handleBackToList}
          />
        );
      
      case 'details':
        return selectedPipeline ? (
          <PipelineDetails
            pipeline={selectedPipeline}
            onEdit={() => handleEditPipeline(selectedPipeline)}
            onBack={handleBackToList}
          />
        ) : null;
      
      default:
        return (
          <PipelineList
            pipelines={pipelines}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onSortChange={handleSortChange}
            onRun={handleRunPipeline}
            onStop={handleStopPipeline}
            onEdit={handleEditPipeline}
            onDelete={handleDeletePipeline}
            onViewDetails={handleViewDetails}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'list' ? 'Pipeline Manager' : 
             activeView === 'create' ? 'Create Pipeline' :
             activeView === 'edit' ? 'Edit Pipeline' : 'Pipeline Details'}
          </h1>
          {activeView === 'list' && (
            <p className="text-gray-600 mt-1">
              Manage your data pipelines and workflows
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {activeView === 'list' && (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Pipeline
              </button>
            </>
          )}
          
          {activeView !== 'list' && (
            <button
              onClick={handleBackToList}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards - Only show on list view */}
      {activeView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{pipelineStats.total}</div>
            <div className="text-sm text-gray-600">Total Pipelines</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{pipelineStats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{pipelineStats.running}</div>
            <div className="text-sm text-gray-600">Running</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{pipelineStats.error}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{pipelineStats.scheduled}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {renderContent()}
    </div>
  );
};

export default PipelineManagerOptimized;

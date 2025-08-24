'use client';

import React, { memo, useMemo } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import PipelineCard from './PipelineCard';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';

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

interface PipelineListProps {
  pipelines: Pipeline[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  statusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (term: string) => void;
  onStatusFilterChange: (status: string) => void;
  onSortChange: (field: string) => void;
  onRun: (id: string) => void;
  onStop: (id: string) => void;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (id: string) => void;
  onViewDetails: (pipeline: Pipeline) => void;
}

const PipelineList: React.FC<PipelineListProps> = memo(({
  pipelines,
  loading,
  error,
  searchTerm,
  statusFilter,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onRun,
  onStop,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  // Memoized filtered and sorted pipelines
  const filteredPipelines = useMemo(() => {
    let filtered = pipelines;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pipeline =>
        pipeline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pipeline.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(pipeline => pipeline.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Pipeline];
      let bValue: any = b[sortBy as keyof Pipeline];

      // Handle date sorting
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [pipelines, searchTerm, statusFilter, sortBy, sortOrder]);

  // Memoized status counts
  const statusCounts = useMemo(() => {
    return pipelines.reduce((counts, pipeline) => {
      counts[pipeline.status] = (counts[pipeline.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [pipelines]);

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

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pipelines..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Status ({pipelines.length})</option>
              <option value="active">Active ({statusCounts.active || 0})</option>
              <option value="running">Running ({statusCounts.running || 0})</option>
              <option value="inactive">Inactive ({statusCounts.inactive || 0})</option>
              <option value="draft">Draft ({statusCounts.draft || 0})</option>
              <option value="error">Error ({statusCounts.error || 0})</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="created_at">Created</option>
            <option value="updated_at">Updated</option>
          </select>
          
          <button
            onClick={() => onSortChange(sortBy)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredPipelines.length} of {pipelines.length} pipelines
      </div>

      {/* Pipeline Grid */}
      {filteredPipelines.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No pipelines found</div>
          <div className="text-sm text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first pipeline to get started'
            }
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onRun={onRun}
              onStop={onStop}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
});

PipelineList.displayName = 'PipelineList';

export default PipelineList;

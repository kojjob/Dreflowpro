'use client';

import React, { memo, useCallback } from 'react';
import { Card } from '../ui/Card';
import {
  Play,
  StopCircle,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  ArrowRight,
  Settings
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

interface PipelineCardProps {
  pipeline: Pipeline;
  onRun: (id: string) => void;
  onStop: (id: string) => void;
  onEdit: (pipeline: Pipeline) => void;
  onDelete: (id: string) => void;
  onViewDetails: (pipeline: Pipeline) => void;
}

const PipelineCard: React.FC<PipelineCardProps> = memo(({
  pipeline,
  onRun,
  onStop,
  onEdit,
  onDelete,
  onViewDetails
}) => {
  const getStatusIcon = useCallback(() => {
    switch (pipeline.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <StopCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  }, [pipeline.status]);

  const getStatusColor = useCallback(() => {
    switch (pipeline.status) {
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
  }, [pipeline.status]);

  const handleRun = useCallback(() => onRun(pipeline.id), [onRun, pipeline.id]);
  const handleStop = useCallback(() => onStop(pipeline.id), [onStop, pipeline.id]);
  const handleEdit = useCallback(() => onEdit(pipeline), [onEdit, pipeline]);
  const handleDelete = useCallback(() => onDelete(pipeline.id), [onDelete, pipeline.id]);
  const handleViewDetails = useCallback(() => onViewDetails(pipeline), [onViewDetails, pipeline]);

  const stepCount = pipeline.pipeline_config?.steps?.length || 0;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{pipeline.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {pipeline.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-3">{pipeline.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Database className="w-4 h-4" />
              <span>{stepCount} steps</span>
            </div>
            {pipeline.is_scheduled && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Scheduled</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="capitalize">{pipeline.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {pipeline.status === 'running' ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}
          
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            Details
          </button>
          
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {pipeline.next_run && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Next run: {new Date(pipeline.next_run).toLocaleString()}</span>
          </div>
        </div>
      )}
    </Card>
  );
});

PipelineCard.displayName = 'PipelineCard';

export default PipelineCard;

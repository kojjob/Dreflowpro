'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { apiService } from '../../services/api';
import Logger from '../../utils/logger';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import {
  Save,
  X,
  Plus,
  Trash2,
  Database,
  ArrowRight,
  Settings,
  Play
} from 'lucide-react';

interface Pipeline {
  id?: string;
  name: string;
  description: string;
  status?: 'draft' | 'active' | 'inactive' | 'running' | 'error';
  is_scheduled: boolean;
  schedule_cron?: string;
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

interface PipelineEditorProps {
  pipeline?: Pipeline | null;
  onSave: () => void;
  onCancel: () => void;
}

const PipelineEditor: React.FC<PipelineEditorProps> = memo(({
  pipeline,
  onSave,
  onCancel
}) => {
  // Performance monitoring
  usePerformanceMonitor({ 
    componentName: 'PipelineEditor',
    threshold: 100 
  });

  const [formData, setFormData] = useState<Pipeline>({
    name: '',
    description: '',
    is_scheduled: false,
    schedule_cron: '',
    pipeline_config: { steps: [] }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (pipeline) {
      setFormData({
        ...pipeline,
        pipeline_config: pipeline.pipeline_config || { steps: [] }
      });
    }
  }, [pipeline]);

  // Memoized handlers
  const handleInputChange = useCallback((field: keyof Pipeline, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Pipeline name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const endpoint = pipeline?.id ? `/pipelines/${pipeline.id}` : '/pipelines';
      const method = pipeline?.id ? 'put' : 'post';
      
      await apiService[method](endpoint, formData);
      
      Logger.log('✅ Pipeline saved successfully');
      onSave();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to save pipeline';
      setError(errorMessage);
      Logger.error('❌ Failed to save pipeline:', err);
    } finally {
      setSaving(false);
    }
  }, [formData, pipeline, onSave]);

  const addStep = useCallback(() => {
    const newStep = {
      id: `step_${Date.now()}`,
      step_order: (formData.pipeline_config?.steps?.length || 0) + 1,
      step_type: 'source' as const,
      step_name: 'New Step',
      step_config: {}
    };

    setFormData(prev => ({
      ...prev,
      pipeline_config: {
        ...prev.pipeline_config,
        steps: [...(prev.pipeline_config?.steps || []), newStep]
      }
    }));
  }, [formData.pipeline_config?.steps]);

  const removeStep = useCallback((stepId: string) => {
    setFormData(prev => ({
      ...prev,
      pipeline_config: {
        ...prev.pipeline_config,
        steps: prev.pipeline_config?.steps?.filter(step => step.id !== stepId) || []
      }
    }));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<any>) => {
    setFormData(prev => ({
      ...prev,
      pipeline_config: {
        ...prev.pipeline_config,
        steps: prev.pipeline_config?.steps?.map(step => 
          step.id === stepId ? { ...step, ...updates } : step
        ) || []
      }
    }));
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter pipeline name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status || 'draft'}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what this pipeline does"
          />
        </div>

        {/* Scheduling */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="is_scheduled"
              checked={formData.is_scheduled}
              onChange={(e) => handleInputChange('is_scheduled', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_scheduled" className="text-sm font-medium text-gray-700">
              Enable Scheduling
            </label>
          </div>

          {formData.is_scheduled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cron Expression
              </label>
              <input
                type="text"
                value={formData.schedule_cron || ''}
                onChange={(e) => handleInputChange('schedule_cron', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0 0 * * * (daily at midnight)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use cron format: minute hour day month weekday
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Pipeline Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Steps</h3>
          <button
            onClick={addStep}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>

        <div className="space-y-4">
          {formData.pipeline_config?.steps?.map((step, index) => (
            <div key={step.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <input
                    type="text"
                    value={step.step_name}
                    onChange={(e) => updateStep(step.id, { step_name: e.target.value })}
                    className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                </div>
                
                <button
                  onClick={() => removeStep(step.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step Type
                  </label>
                  <select
                    value={step.step_type}
                    onChange={(e) => updateStep(step.id, { step_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="source">Source</option>
                    <option value="transform">Transform</option>
                    <option value="destination">Destination</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={step.step_order}
                    onChange={(e) => updateStep(step.id, { step_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              {index < (formData.pipeline_config?.steps?.length || 0) - 1 && (
                <div className="flex justify-center mt-4">
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {(!formData.pipeline_config?.steps || formData.pipeline_config.steps.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No steps added yet</p>
              <p className="text-sm">Click "Add Step" to get started</p>
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : (pipeline?.id ? 'Update Pipeline' : 'Create Pipeline')}
        </button>
      </div>
    </div>
  );
});

PipelineEditor.displayName = 'PipelineEditor';

export default PipelineEditor;

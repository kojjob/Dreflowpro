'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, BarChart3, Presentation, Database, Zap, Calendar, Settings } from 'lucide-react';
import { CreateReportParams } from '../../services/reports';
import { apiService } from '../../services/api';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateReportParams) => Promise<void>;
  loading?: boolean;
}

interface DataSource {
  id: string;
  name: string;
  type: 'dataset' | 'pipeline';
  description?: string;
  recordCount?: number;
  lastUpdated?: string;
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateReportParams>({
    title: '',
    description: '',
    report_type: 'EXECUTIVE',
    format: 'PDF',
    generate_immediately: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loadingDataSources, setLoadingDataSources] = useState(false);
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Fallback data in case API fails
  const fallbackReportTypes = [
    {
      value: 'EXECUTIVE',
      label: 'Executive Summary',
      description: 'High-level overview for leadership',
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      value: 'ANALYST',
      label: 'Analyst Report',
      description: 'Detailed analysis with insights',
      icon: FileText,
      color: 'from-green-500 to-emerald-600'
    },
    {
      value: 'PRESENTATION',
      label: 'Presentation',
      description: 'Slide deck for meetings',
      icon: Presentation,
      color: 'from-purple-500 to-violet-600'
    },
    {
      value: 'DASHBOARD_EXPORT',
      label: 'Dashboard Export',
      description: 'Current dashboard snapshot',
      icon: Database,
      color: 'from-orange-500 to-red-600'
    }
  ];

  const fallbackFormats = [
    { value: 'PDF', label: 'PDF Document', description: 'Portable document format' },
    { value: 'EXCEL', label: 'Excel Spreadsheet', description: 'Microsoft Excel format' },
    { value: 'POWERPOINT', label: 'PowerPoint', description: 'Microsoft PowerPoint format' },
    { value: 'CSV', label: 'CSV Data', description: 'Comma-separated values' }
  ];

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'BarChart3': BarChart3,
      'FileText': FileText,
      'Presentation': Presentation,
      'Database': Database
    };
    return iconMap[iconName] || FileText;
  };

  // Get dynamic report types and formats from config or use fallbacks
  const reportTypes = reportConfig?.data?.report_types?.map((type: any) => ({
    value: type.value,
    label: type.label,
    description: type.description,
    icon: getIconComponent(type.icon),
    color: type.color || 'from-gray-500 to-gray-600',
    features: type.features || []
  })) || fallbackReportTypes;

  const formats = reportConfig?.data?.formats || fallbackFormats;

  const loadReportConfig = async () => {
    setLoadingConfig(true);
    try {
      const configResponse = await apiService.getReportConfig();
      if (configResponse.success) {
        setReportConfig(configResponse);
        
        // Set default report type and format from configuration
        if (configResponse.data.settings) {
          setFormData(prev => ({
            ...prev,
            report_type: configResponse.data.settings.default_report_type || 'EXECUTIVE',
            format: configResponse.data.settings.default_format || 'PDF'
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load report configuration:', error);
      // Will use fallback values defined above
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadDataSources = async () => {
    setLoadingDataSources(true);
    try {
      // Fetch datasets and pipelines in parallel
      const [datasetsResponse, pipelinesResponse] = await Promise.all([
        apiService.getDatasets(),
        apiService.getPipelines()
      ]);

      const dataSources: DataSource[] = [];

      // Add datasets
      if (datasetsResponse.success && datasetsResponse.data.datasets) {
        datasetsResponse.data.datasets.forEach((dataset: any) => {
          dataSources.push({
            id: dataset.id,
            name: dataset.name,
            type: 'dataset',
            description: dataset.description || '',
            recordCount: dataset.recordCount || dataset.size || 0,
            lastUpdated: dataset.lastUpdated || new Date(dataset.updated_at || dataset.created_at).toISOString().split('T')[0]
          });
        });
      }

      // Add pipelines
      if (pipelinesResponse.success && pipelinesResponse.data) {
        const pipelines = Array.isArray(pipelinesResponse.data) ? pipelinesResponse.data : pipelinesResponse.data.pipelines || [];
        pipelines.forEach((pipeline: any) => {
          dataSources.push({
            id: pipeline.id,
            name: pipeline.name,
            type: 'pipeline',
            description: pipeline.description || '',
            recordCount: pipeline.last_execution?.records_processed || 0,
            lastUpdated: new Date(pipeline.updated_at || pipeline.created_at).toISOString().split('T')[0]
          });
        });
      }

      setDataSources(dataSources);
    } catch (error) {
      console.error('Failed to load data sources:', error);
      // Set fallback data sources on error
      setDataSources([
        {
          id: 'dataset_1',
          name: 'Customer Analytics Dataset',
          type: 'dataset',
          description: 'Customer behavior and demographics data',
          recordCount: 125000,
          lastUpdated: '2024-01-20'
        },
        {
          id: 'dataset_2', 
          name: 'Sales Performance Dataset',
          type: 'dataset',
          description: 'Sales metrics and revenue data',
          recordCount: 45000,
          lastUpdated: '2024-01-19'
        }
      ]);
    } finally {
      setLoadingDataSources(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: '',
        description: '',
        report_type: 'EXECUTIVE',
        format: 'PDF',
        generate_immediately: true
      });
      setErrors({});
      setStep(1);
      
      // Load report configuration and data sources in parallel
      Promise.all([
        loadReportConfig(),
        loadDataSources()
      ]);
    }
  }, [isOpen]);

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Report title is required';
      }
      if (!formData.report_type) {
        newErrors.report_type = 'Report type is required';
      }
      if (!formData.format) {
        newErrors.format = 'Format is required';
      }
    }

    if (stepNumber === 2) {
      if (!formData.dataset_id && !formData.pipeline_id) {
        newErrors.data_source = 'Please select a data source';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(2)) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleDataSourceSelect = (source: DataSource) => {
    if (source.type === 'dataset') {
      setFormData(prev => ({
        ...prev,
        dataset_id: source.id,
        pipeline_id: undefined
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pipeline_id: source.id,
        dataset_id: undefined
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create New Report</h2>
                <p className="text-blue-100 text-sm">
                  Step {step} of 2: {step === 1 ? 'Report Details' : 'Data Source'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter report title..."
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Optional description..."
                  />
                </div>

                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Report Type *
                  </label>
                  {loadingConfig ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className="p-4 border-2 border-gray-200 rounded-lg animate-pulse">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reportTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, report_type: type.value as any }))}
                          className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            formData.report_type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${type.color} rounded-lg flex items-center justify-center`}>
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{type.label}</h4>
                              <p className="text-sm text-gray-500">{type.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    </div>
                  )}
                  {errors.report_type && <p className="text-red-500 text-sm mt-1">{errors.report_type}</p>}
                </div>

                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Format *
                  </label>
                  {loadingConfig ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg animate-pulse bg-gray-100">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.format ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {formats.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label} - {format.description}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.format && <p className="text-red-500 text-sm mt-1">{errors.format}</p>}
                </div>

                {/* Generate Immediately */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="generate_immediately"
                    checked={formData.generate_immediately}
                    onChange={(e) => setFormData(prev => ({ ...prev, generate_immediately: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="generate_immediately" className="text-sm text-gray-700">
                    Generate report immediately after creation
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Data Source</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Choose the dataset or pipeline to use for generating your report.
                  </p>
                  
                  {loadingDataSources ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">Loading data sources...</p>
                      </div>
                    </div>
                  ) : dataSources.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No data sources available</p>
                      <p className="text-sm text-gray-400">Create datasets or pipelines to generate reports</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dataSources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => handleDataSourceSelect(source)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                          formData.dataset_id === source.id || formData.pipeline_id === source.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              source.type === 'dataset' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-purple-100 text-purple-600'
                            }`}>
                              {source.type === 'dataset' ? (
                                <Database className="w-4 h-4" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{source.name}</h4>
                              <p className="text-sm text-gray-500">{source.description}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-xs text-gray-400">
                                  {source.recordCount?.toLocaleString()} records
                                </span>
                                <span className="text-xs text-gray-400">
                                  Updated {source.lastUpdated}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            source.type === 'dataset' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {source.type}
                          </span>
                        </div>
                      </button>
                      ))}
                    </div>
                  )}
                  {errors.data_source && <p className="text-red-500 text-sm mt-2">{errors.data_source}</p>}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex space-x-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Report'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateReportModal;

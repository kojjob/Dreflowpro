'use client';

import React, { useState } from 'react';
import { Download, FileText, Image, Globe, Table, Presentation, Mail, Share2 } from 'lucide-react';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'powerpoint' | 'html' | 'csv' | 'json';
  includeCharts: boolean;
  includeData: boolean;
  includeInsights: boolean;
  includeStatistics: boolean;
  template: 'executive' | 'detailed' | 'presentation' | 'custom';
  title: string;
  description: string;
}

interface ExportSystemProps {
  data: any[];
  charts: any[];
  insights: any[];
  statistics: any[];
  onExport: (options: ExportOptions) => void;
  onShare?: (options: { method: 'email' | 'link'; recipients?: string[] }) => void;
}

const ExportSystem: React.FC<ExportSystemProps> = ({
  data,
  charts,
  insights,
  statistics,
  onExport,
  onShare
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeData: true,
    includeInsights: true,
    includeStatistics: true,
    template: 'executive',
    title: 'Data Analysis Report',
    description: 'Comprehensive analysis of uploaded data with insights and visualizations'
  });

  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional report (opens print dialog - save as PDF)',
      icon: FileText,
      color: 'text-red-600',
      features: ['Charts', 'Insights', 'Statistics', 'Professional Layout']
    },
    {
      id: 'excel',
      name: 'Excel Spreadsheet',
      description: 'Processed data with embedded charts and pivot tables',
      icon: Table,
      color: 'text-green-600',
      features: ['Raw Data', 'Pivot Tables', 'Charts', 'Formulas']
    },
    {
      id: 'powerpoint',
      name: 'PowerPoint Slides',
      description: 'Presentation-ready slides with visualizations',
      icon: Presentation,
      color: 'text-orange-600',
      features: ['Slide Templates', 'Charts', 'Key Insights', 'Speaker Notes']
    },
    {
      id: 'html',
      name: 'Interactive Dashboard',
      description: 'Web-based dashboard for real-time exploration',
      icon: Globe,
      color: 'text-blue-600',
      features: ['Interactive Charts', 'Filters', 'Drill-down', 'Responsive']
    },
    {
      id: 'csv',
      name: 'CSV Data',
      description: 'Clean, processed data for further analysis',
      icon: Table,
      color: 'text-gray-600',
      features: ['Clean Data', 'Standardized Format', 'No Formatting']
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Structured data with metadata and insights',
      icon: FileText,
      color: 'text-purple-600',
      features: ['Structured Data', 'Metadata', 'API Ready', 'Machine Readable']
    }
  ];

  const templates = [
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level overview with key insights and recommendations',
      sections: ['Executive Summary', 'Key Insights', 'Recommendations', 'Supporting Charts']
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive report with full statistical analysis',
      sections: ['Data Overview', 'Statistical Summary', 'Detailed Insights', 'All Visualizations', 'Methodology']
    },
    {
      id: 'presentation',
      name: 'Presentation Format',
      description: 'Slide-ready format optimized for presentations',
      sections: ['Title Slide', 'Data Overview', 'Key Findings', 'Visualizations', 'Conclusions']
    },
    {
      id: 'custom',
      name: 'Custom Template',
      description: 'Choose specific sections and customize layout',
      sections: ['Customizable sections based on selections']
    }
  ];

  const handleExport = () => {
    onExport(exportOptions);
    setShowExportModal(false);
  };

  const handleQuickExport = (format: ExportOptions['format']) => {
    const quickOptions: ExportOptions = {
      ...exportOptions,
      format,
      template: format === 'powerpoint' ? 'presentation' : format === 'csv' || format === 'json' ? 'custom' : 'executive'
    };
    onExport(quickOptions);
  };

  const updateExportOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  };

  const getFormatIcon = (format: string) => {
    const formatInfo = exportFormats.find(f => f.id === format);
    if (!formatInfo) return FileText;
    return formatInfo.icon;
  };

  return (
    <div className="space-y-6">
      {/* Quick Export Buttons */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Export & Share</h3>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Advanced Export</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {exportFormats.map((format) => {
            const IconComponent = format.icon;
            return (
              <button
                key={format.id}
                onClick={() => handleQuickExport(format.id as ExportOptions['format'])}
                className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <IconComponent className={`w-8 h-8 ${format.color} mb-2`} />
                <span className="text-sm font-medium text-gray-900">{format.name}</span>
                <span className="text-xs text-gray-500 text-center mt-1">{format.description}</span>
              </button>
            );
          })}
        </div>

        {/* Share Options */}
        {onShare && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Share Results</h4>
            <div className="flex space-x-3">
              <button
                onClick={() => onShare({ method: 'email' })}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Mail className="w-4 h-4" />
                <span>Email Report</span>
              </button>
              <button
                onClick={() => onShare({ method: 'link' })}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Statistics */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Export Preview</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.length.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Data Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{charts.length}</div>
            <div className="text-sm text-gray-600">Visualizations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{insights.length}</div>
            <div className="text-sm text-gray-600">Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{statistics.length}</div>
            <div className="text-sm text-gray-600">Statistics</div>
          </div>
        </div>
      </div>

      {/* Advanced Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">Advanced Export Options</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Format Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Export Format</h4>
                <div className="space-y-3">
                  {exportFormats.map((format) => {
                    const IconComponent = format.icon;
                    return (
                      <label
                        key={format.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                          exportOptions.format === format.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={format.id}
                          checked={exportOptions.format === format.id}
                          onChange={(e) => updateExportOptions({ format: e.target.value as ExportOptions['format'] })}
                          className="sr-only"
                        />
                        <IconComponent className={`w-5 h-5 ${format.color} mr-3`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{format.name}</div>
                          <div className="text-sm text-gray-600">{format.description}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {format.features.map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Report Template</h4>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                        exportOptions.template === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={exportOptions.template === template.id}
                        onChange={(e) => updateExportOptions({ template: e.target.value as ExportOptions['template'] })}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                        <div className="text-xs text-gray-500">
                          Includes: {template.sections.join(', ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Options */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Include Content</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => updateExportOptions({ includeCharts: e.target.checked })}
                    className="rounded border-gray-300 mr-2"
                  />
                  <span className="text-sm text-gray-700">Charts & Visualizations</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeData}
                    onChange={(e) => updateExportOptions({ includeData: e.target.checked })}
                    className="rounded border-gray-300 mr-2"
                  />
                  <span className="text-sm text-gray-700">Raw Data</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeInsights}
                    onChange={(e) => updateExportOptions({ includeInsights: e.target.checked })}
                    className="rounded border-gray-300 mr-2"
                  />
                  <span className="text-sm text-gray-700">Generated Insights</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStatistics}
                    onChange={(e) => updateExportOptions({ includeStatistics: e.target.checked })}
                    className="rounded border-gray-300 mr-2"
                  />
                  <span className="text-sm text-gray-700">Statistical Summary</span>
                </label>
              </div>
            </div>

            {/* Report Details */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                <input
                  type="text"
                  value={exportOptions.title}
                  onChange={(e) => updateExportOptions({ title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter report title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={exportOptions.description}
                  onChange={(e) => updateExportOptions({ description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter report description"
                />
              </div>
            </div>

            {/* Export Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Export Preview</h5>
              <div className="text-sm text-gray-600">
                <div>Format: <span className="font-medium">{exportFormats.find(f => f.id === exportOptions.format)?.name}</span></div>
                <div>Template: <span className="font-medium">{templates.find(t => t.id === exportOptions.template)?.name}</span></div>
                <div>Content: {[
                  exportOptions.includeCharts && 'Charts',
                  exportOptions.includeData && 'Data',
                  exportOptions.includeInsights && 'Insights',
                  exportOptions.includeStatistics && 'Statistics'
                ].filter(Boolean).join(', ')}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportSystem;

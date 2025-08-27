'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Database, BarChart3, Brain, Download, ArrowRight, CheckCircle, Clock, 
  AlertCircle, Zap, Target, Sparkles, TrendingUp, FileText, Activity,
  Search, Filter, Settings, Eye, Trash2, Play, Pause, RotateCcw, Info,
  User, Calendar, Globe, Share2, BookOpen, HelpCircle, Bookmark, 
  Bell, Mail, MessageSquare, Star, Award, Shield, Lock, Unlock
} from 'lucide-react';
import FileUploadSystem from './FileUploadSystem';
import { 
  LazyDataManipulation, 
  LazyInsightsGeneration, 
  LazyVisualizationDashboard, 
  LazyExportSystem 
} from '../charts/LazyChartComponents';
import Logger from '../../utils/logger';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  format: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: any[];
  schema?: {
    columns: Array<{
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean';
      nullable: boolean;
      unique: boolean;
      samples: any[];
    }>;
    rowCount: number;
    encoding?: string;
  };
  error?: string;
  uploadedAt: string;
}

interface DataTransformation {
  id: string;
  type: 'filter' | 'sort' | 'group' | 'calculate' | 'clean' | 'validate';
  name: string;
  config: any;
  applied: boolean;
}

interface Insight {
  id: string;
  type: 'pattern' | 'outlier' | 'trend' | 'quality' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
  data?: any;
}

type WorkflowStep = 'upload' | 'manipulate' | 'analyze' | 'visualize' | 'export';

const DataAnalysisWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [transformedData, setTransformedData] = useState<any[]>([]);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: 'info' | 'success' | 'warning' | 'error'}>>([]);
  const [workflowProgress, setWorkflowProgress] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const workflowSteps = [
    {
      id: 'upload' as WorkflowStep,
      name: 'Upload Data',
      description: 'Upload and preview your data files',
      icon: Upload,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'manipulate' as WorkflowStep,
      name: 'Transform Data',
      description: 'Clean, filter, and manipulate your data',
      icon: Database,
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'analyze' as WorkflowStep,
      name: 'Generate Insights',
      description: 'Discover patterns and generate insights',
      icon: Brain,
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'visualize' as WorkflowStep,
      name: 'Create Visualizations',
      description: 'Build charts and dashboards',
      icon: BarChart3,
      color: 'orange',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      id: 'export' as WorkflowStep,
      name: 'Export Results',
      description: 'Export reports and share insights',
      icon: Download,
      color: 'pink',
      gradient: 'from-pink-500 to-rose-500'
    }
  ];

  const getStepStatus = (stepId: WorkflowStep): 'completed' | 'current' | 'pending' => {
    const stepIndex = workflowSteps.findIndex(step => step.id === stepId);
    const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const canProceedToStep = (stepId: WorkflowStep): boolean => {
    switch (stepId) {
      case 'upload':
        return true;
      case 'manipulate':
        return selectedFile?.status === 'completed';
      case 'analyze':
        return selectedFile?.status === 'completed';
      case 'visualize':
        return selectedFile?.status === 'completed';
      case 'export':
        return selectedFile?.status === 'completed' && (insights.length > 0 || charts.length > 0);
      default:
        return false;
    }
  };

  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setUploadedFiles(prev => {
      const updated = prev.map(f => f.id === file.id ? file : f);
      if (!updated.find(f => f.id === file.id)) {
        updated.push(file);
      }
      return updated;
    });

    // Auto-select the first completed file
    if (file.status === 'completed' && !selectedFile) {
      setSelectedFile(file);
      setTransformedData(file.preview || []);
    }
  }, [selectedFile]);

  const handleDataChanged = useCallback((data: any[], transformations: DataTransformation[]) => {
    setTransformedData(data);
    setTransformations(transformations);
  }, []);

  const handleInsightGenerated = useCallback((newInsights: Insight[]) => {
    setInsights(newInsights);
  }, []);

  const handleExport = useCallback((options: any) => {
    Logger.log('Exporting with options:', options);

    try {
      switch (options.format) {
        case 'pdf':
          generatePDFReport(options);
          break;
        case 'excel':
          generateExcelReport(options);
          break;
        case 'csv':
          generateCSVReport(options);
          break;
        case 'json':
          generateJSONReport(options);
          break;
        case 'html':
          generateHTMLReport(options);
          break;
        default:
          generateJSONReport(options);
      }
    } catch (error) {
      Logger.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [transformedData, charts, insights, statistics]);

  const generatePDFReport = (options: any) => {
    // Create a printable HTML document
    const reportHTML = createReportHTML(options);

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Note: User will need to "Save as PDF" in the print dialog
        }, 500);
      };
    }
  };

  const generateExcelReport = (options: any) => {
    // Create CSV format that Excel can open
    const csvContent = convertToCSV(transformedData);
    downloadFile(csvContent, `${options.title || 'data-analysis'}.csv`, 'text/csv');
  };

  const generateCSVReport = (options: any) => {
    const csvContent = convertToCSV(transformedData);
    downloadFile(csvContent, `${options.title || 'data-analysis'}.csv`, 'text/csv');
  };

  const generateJSONReport = (options: any) => {
    const exportData = {
      metadata: {
        title: options.title,
        description: options.description,
        exportedAt: new Date().toISOString(),
        format: options.format
      },
      data: transformedData,
      charts: charts.map(chart => ({
        id: chart.id,
        type: chart.type,
        title: chart.title,
        config: chart.config
      })),
      insights: insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        impact: insight.impact
      })),
      statistics: statistics
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `${options.title || 'data-analysis'}.json`, 'application/json');
  };

  const generateHTMLReport = (options: any) => {
    const htmlContent = createReportHTML(options);
    downloadFile(htmlContent, `${options.title || 'data-analysis'}.html`, 'text/html');
  };

  const createReportHTML = (options: any) => {
    const currentDate = new Date().toLocaleDateString();
    const dataPreview = transformedData.slice(0, 10); // First 10 rows for preview

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || 'Data Analysis Report'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        .insight { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; }
        .insight.high { border-left-color: #dc3545; }
        .insight.medium { border-left-color: #ffc107; }
        .insight.low { border-left-color: #28a745; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${options.title || 'Data Analysis Report'}</h1>
        <p>${options.description || 'Comprehensive analysis of uploaded data'}</p>
        <p><strong>Generated:</strong> ${currentDate}</p>
    </div>

    ${options.includeStatistics ? `
    <div class="section">
        <h2>📊 Key Statistics</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${transformedData.length}</div>
                <div>Total Records</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${selectedFile?.schema?.columns.length || 0}</div>
                <div>Data Columns</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${insights.length}</div>
                <div>Insights Generated</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${charts.length}</div>
                <div>Visualizations</div>
            </div>
        </div>
    </div>
    ` : ''}

    ${options.includeInsights ? `
    <div class="section">
        <h2>🧠 Key Insights</h2>
        ${insights.map(insight => `
            <div class="insight ${insight.impact}">
                <h3>${insight.title}</h3>
                <p>${insight.description}</p>
                <p><strong>Impact:</strong> ${insight.impact.toUpperCase()} | <strong>Confidence:</strong> ${(insight.confidence * 100).toFixed(0)}%</p>
                ${insight.recommendation ? `<p><strong>Recommendation:</strong> ${insight.recommendation}</p>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${options.includeCharts ? `
    <div class="section">
        <h2>📈 Visualizations</h2>
        ${charts.map(chart => `
            <div style="margin: 20px 0;">
                <h3>${chart.title}</h3>
                <p><strong>Type:</strong> ${chart.type} | <strong>Data Points:</strong> ${chart.data?.length || 0}</p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 4px;">
                    Chart visualization: ${chart.title} (${chart.type})
                </p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${options.includeData ? `
    <div class="section">
        <h2>📋 Data Preview</h2>
        <p><strong>Showing first 10 records of ${transformedData.length} total</strong></p>
        <table>
            <thead>
                <tr>
                    ${selectedFile?.schema?.columns.map(col => `<th>${col.name}</th>`).join('') || ''}
                </tr>
            </thead>
            <tbody>
                ${dataPreview.map(row => `
                    <tr>
                        ${selectedFile?.schema?.columns.map(col => `<td>${row[col.name] || ''}</td>`).join('') || ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h2>ℹ️ Report Information</h2>
        <p><strong>File:</strong> ${selectedFile?.name || 'Unknown'}</p>
        <p><strong>File Size:</strong> ${selectedFile ? (selectedFile.size / 1024).toFixed(2) + ' KB' : 'Unknown'}</p>
        <p><strong>Export Format:</strong> ${options.format.toUpperCase()}</p>
        <p><strong>Template:</strong> ${options.template}</p>
        <p><strong>Generated by:</strong> DreflowPro Data Analysis Platform</p>
    </div>
</body>
</html>`;
  };

  const convertToCSV = (data: any[]) => {
    if (!data.length || !selectedFile?.schema?.columns) return '';

    const headers = selectedFile.schema.columns.map(col => col.name);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = useCallback((options: { method: 'email' | 'link'; recipients?: string[] }) => {
    Logger.log('Sharing with options:', options);
    // In production, this would implement actual sharing functionality
    const newNotification = {
      id: Date.now().toString(),
      message: `Sharing via ${options.method} - Feature coming soon!`,
      type: 'info' as const
    };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  // Calculate workflow progress
  useEffect(() => {
    const completedSteps = workflowSteps.filter(step => getStepStatus(step.id) === 'completed').length;
    const currentStepIndex = workflowSteps.findIndex(step => step.id === currentStep);
    const progress = ((completedSteps + (currentStepIndex >= 0 ? 0.5 : 0)) / workflowSteps.length) * 100;
    setWorkflowProgress(Math.min(progress, 100));
  }, [currentStep, uploadedFiles, selectedFile, transformations, insights, charts]);

  // Auto-advance functionality
  useEffect(() => {
    if (autoAdvance && canProceedToNextStep()) {
      const timer = setTimeout(() => {
        const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
        if (currentIndex < workflowSteps.length - 1) {
          setCurrentStep(workflowSteps[currentIndex + 1].id);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoAdvance, currentStep, workflowSteps]);

  const canProceedToNextStep = () => {
    const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
    if (currentIndex < workflowSteps.length - 1) {
      const nextStep = workflowSteps[currentIndex + 1];
      return canProceedToStep(nextStep.id);
    }
    return false;
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type
    };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getStepTips = (step: WorkflowStep): string[] => {
    const tips = {
      upload: [
        "Supported formats: CSV, Excel, JSON, TSV",
        "Drag and drop multiple files for batch processing",
        "Check data preview before proceeding",
        "Ensure column headers are in the first row"
      ],
      manipulate: [
        "Use filters to focus on specific data subsets",
        "Apply transformations in logical order",
        "Preview changes before applying them",
        "Save transformation templates for reuse"
      ],
      analyze: [
        "Let AI identify patterns automatically",
        "Review insights by confidence level",
        "Export insights for further analysis",
        "Combine multiple analysis methods"
      ],
      visualize: [
        "Start with simple charts, then add complexity",
        "Choose chart types based on data relationships",
        "Use consistent colors across charts",
        "Add interactive elements for engagement"
      ],
      export: [
        "Choose appropriate format for your audience",
        "Include data context and metadata",
        "Test exports with sample audiences",
        "Set up automated report delivery"
      ]
    };
    return tips[step] || [];
  };

  const getStepIcon = (step: typeof workflowSteps[0], status: string) => {
    const IconComponent = step.icon;
    
    if (status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    } else if (status === 'current') {
      return <Clock className="w-6 h-6 text-blue-600" />;
    } else {
      return <IconComponent className="w-6 h-6 text-gray-400" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="space-y-8">
            {/* Upload Section Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Data</h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Drag and drop your files or click to browse. Supports CSV, Excel, JSON, and more formats.
              </p>
            </div>

            {/* File Upload System */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200/50">
              <FileUploadSystem
                onFileUploaded={handleFileUploaded}
                onFileAnalyzed={(file) => Logger.log('File analyzed:', file)}
              />
            </div>
            
            {/* File Selection */}
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Uploaded Files</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{uploadedFiles.filter(f => f.status === 'completed').length} ready for analysis</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedFiles.filter(f => f.status === 'completed').map((file) => (
                    <motion.label
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`relative flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedFile?.id === file.id
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                          : 'bg-gray-50 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedFile"
                        checked={selectedFile?.id === file.id}
                        onChange={() => {
                          setSelectedFile(file);
                          setTransformedData(file.preview || []);
                        }}
                        className="sr-only"
                      />
                      
                      {/* File Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                        selectedFile?.id === file.id
                          ? 'bg-white/20'
                          : 'bg-blue-100'
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          selectedFile?.id === file.id ? 'text-white' : 'text-blue-600'
                        }`} />
                      </div>
                      
                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold truncate ${
                          selectedFile?.id === file.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {file.name}
                        </div>
                        <div className={`text-sm ${
                          selectedFile?.id === file.id ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          {file.schema?.rowCount.toLocaleString()} rows • {file.schema?.columns.length} columns
                        </div>
                        <div className={`text-xs ${
                          selectedFile?.id === file.id ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {(file.size / 1024).toFixed(1)} KB • {file.format.toUpperCase()}
                        </div>
                      </div>
                      
                      {/* Selection Indicator */}
                      {selectedFile?.id === file.id && (
                        <div className="ml-3">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </motion.label>
                  ))}
                </div>

                {/* File Actions */}
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 pt-6 border-t border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                          <span>Preview Data</span>
                        </button>
                        <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-sm font-medium">
                          <Settings className="w-4 h-4" />
                          <span>File Settings</span>
                        </button>
                      </div>
                      <button className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200">
                        <ArrowRight className="w-4 h-4" />
                        <span>Continue to Transform</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        );

      case 'manipulate':
        return selectedFile && selectedFile.schema ? (
          <div className="space-y-8">
            {/* Transform Section Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transform Your Data</h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Clean, filter, and manipulate your data with powerful transformation tools.
              </p>
            </div>

            {/* Data Overview */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-green-900">Data Overview</h4>
                <div className="flex items-center space-x-4 text-sm text-green-700">
                  <span className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Activity className="w-4 h-4" />
                    <span>{transformations.length} transformations applied</span>
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(transformedData.length || selectedFile.schema?.rowCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Rows</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedFile.schema?.columns.length || 0}
                  </div>
                  <div className="text-sm text-green-700">Columns</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((transformedData.length || selectedFile.schema?.rowCount || 0) / 1000 * 100) / 100}K
                  </div>
                  <div className="text-sm text-green-700">Data Points</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((selectedFile.size || 0) / 1024).toFixed(1)}
                  </div>
                  <div className="text-sm text-green-700">KB Size</div>
                </div>
              </div>
            </div>

            {/* Transformation Tools */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <LazyDataManipulation
                data={selectedFile.preview || []}
                columns={selectedFile.schema.columns}
                onDataChanged={handleDataChanged}
                onExport={(data, format) => Logger.log('Export data:', { data, format })}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No File Selected</h3>
            <p className="text-gray-600 mb-4">Please upload and select a file first to begin data transformation</p>
            <button 
              onClick={() => setCurrentStep('upload')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Upload
            </button>
          </div>
        );

      case 'analyze':
        return selectedFile && selectedFile.schema ? (
          <div className="space-y-8">
            {/* Analyze Section Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Insights</h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Discover hidden patterns, trends, and anomalies in your data with advanced AI analysis.
              </p>
            </div>

            {/* Analysis Status */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-900">Analysis Progress</h4>
                <div className="flex items-center space-x-2">
                  {insights.length > 0 ? (
                    <span className="flex items-center space-x-1 text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>Analysis Complete</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-purple-700 bg-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      <span>Ready to Analyze</span>
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Insights Found</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{insights.length}</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Patterns</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {insights.filter(i => i.type === 'pattern').length}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Outliers</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {insights.filter(i => i.type === 'outlier').length}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Correlations</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {insights.filter(i => i.type === 'correlation').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights Display */}
            {insights.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-gray-900">Key Insights</h4>
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm font-medium">
                      <Download className="w-4 h-4" />
                      <span>Export Insights</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.slice(0, 4).map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={`p-4 rounded-xl border-l-4 ${
                        insight.impact === 'high' ? 'bg-red-50 border-red-400' :
                        insight.impact === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-green-50 border-green-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-gray-900">{insight.title}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                          insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {insight.impact.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Confidence: {(insight.confidence * 100).toFixed(0)}%
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          insight.type === 'pattern' ? 'bg-blue-100 text-blue-800' :
                          insight.type === 'outlier' ? 'bg-orange-100 text-orange-800' :
                          insight.type === 'trend' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {insight.type}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights Generator */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <LazyInsightsGeneration
                data={transformedData.length > 0 ? transformedData : selectedFile.preview || []}
                columns={selectedFile.schema.columns}
                onInsightGenerated={handleInsightGenerated}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">Please upload and select a file first to begin AI analysis</p>
            <button 
              onClick={() => setCurrentStep('upload')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Upload
            </button>
          </div>
        );

      case 'visualize':
        return selectedFile && selectedFile.schema ? (
          <div className="space-y-8">
            {/* Visualize Section Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Visualizations</h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Build interactive charts and dashboards to tell your data's story effectively.
              </p>
            </div>

            {/* Visualization Overview */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-orange-900">Visualization Dashboard</h4>
                <div className="flex items-center space-x-4 text-sm text-orange-700">
                  <span className="flex items-center space-x-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>{charts.length} charts created</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span>{selectedFile.schema?.columns.length} columns available</span>
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Bar Charts</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {charts.filter(c => c.type === 'bar').length}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Line Charts</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {charts.filter(c => c.type === 'line').length}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Pie Charts</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {charts.filter(c => c.type === 'pie').length}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Scatter Plots</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {charts.filter(c => c.type === 'scatter').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Gallery */}
            {charts.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-bold text-gray-900">Chart Gallery</h4>
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-800 text-sm font-medium">
                      <Download className="w-4 h-4" />
                      <span>Export Charts</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {charts.slice(0, 4).map((chart, index) => (
                    <motion.div
                      key={chart.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-gray-50 rounded-xl p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-900">{chart.title}</h5>
                        <div className="flex items-center space-x-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Chart Preview Placeholder */}
                      <div className="bg-white rounded-lg h-32 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-500">{chart.type} Chart Preview</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Type: {chart.type}</span>
                        <span>Data points: {chart.data?.length || 0}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart Builder */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-gray-900">Interactive Chart Builder</h4>
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm">AI Suggestions</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200">
                      <BarChart3 className="w-4 h-4" />
                      <span>Create Chart</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <LazyVisualizationDashboard
                  data={transformedData.length > 0 ? transformedData : selectedFile.preview || []}
                  columns={selectedFile.schema.columns}
                  onExportDashboard={(format) => Logger.log('Export dashboard:', format)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">Please upload and select a file first to create visualizations</p>
            <button 
              onClick={() => setCurrentStep('upload')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Upload
            </button>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-8">
            {/* Export Section Header */}
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Export & Share Results</h3>
              <p className="text-gray-600 max-w-lg mx-auto">
                Export your analysis results and share insights with your team or stakeholders.
              </p>
            </div>

            {/* Export Summary */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-pink-900">Export Summary</h4>
                <div className="flex items-center space-x-2 text-sm text-pink-700">
                  <span className="flex items-center space-x-1 bg-pink-100 px-3 py-1 rounded-full font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>Ready for Export</span>
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-pink-600">
                    {(transformedData.length || selectedFile?.schema?.rowCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-pink-700">Data Rows</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-pink-600">{insights.length}</div>
                  <div className="text-sm text-pink-700">Insights</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-pink-600">{charts.length}</div>
                  <div className="text-sm text-pink-700">Charts</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-pink-600">{transformations.length}</div>
                  <div className="text-sm text-pink-700">Transformations</div>
                </div>
              </div>
            </div>

            {/* Quick Export Options */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-gray-900">Quick Export Options</h4>
                <div className="text-sm text-gray-500">Choose your preferred format</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { 
                    format: 'pdf', 
                    title: 'PDF Report', 
                    description: 'Comprehensive report with insights and charts',
                    icon: FileText,
                    color: 'red'
                  },
                  { 
                    format: 'excel', 
                    title: 'Excel Workbook', 
                    description: 'Interactive spreadsheet with data and formulas',
                    icon: Database,
                    color: 'green'
                  },
                  { 
                    format: 'json', 
                    title: 'JSON Data', 
                    description: 'Machine-readable format for developers',
                    icon: Sparkles,
                    color: 'blue'
                  }
                ].map((option, index) => (
                  <motion.button
                    key={option.format}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    onClick={() => handleExport({
                      format: option.format,
                      title: selectedFile?.name || 'Data Analysis',
                      includeData: true,
                      includeInsights: true,
                      includeCharts: true
                    })}
                    className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 bg-${option.color}-100 rounded-xl flex items-center justify-center group-hover:bg-${option.color}-200 transition-colors`}>
                        <option.icon className={`w-6 h-6 text-${option.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900 mb-1">{option.title}</h5>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <div className="mt-2 flex items-center text-xs text-blue-600 group-hover:text-blue-700">
                          <Download className="w-3 h-3 mr-1" />
                          <span>Export Now</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Sharing Options */}
              <div className="border-t border-gray-200 pt-6">
                <h5 className="text-md font-semibold text-gray-900 mb-4">Share Options</h5>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handleShare({ method: 'email' })}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>📧</span>
                    <span>Email Report</span>
                  </button>
                  <button 
                    onClick={() => handleShare({ method: 'link' })}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span>🔗</span>
                    <span>Share Link</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <span>📋</span>
                    <span>Copy to Clipboard</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Export System */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Advanced Export Center</h4>
                    <p className="text-sm text-gray-600 mt-1">Customize, preview, and schedule your data exports</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => addNotification("Export templates loaded", "info")}
                      className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 px-3 py-2 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Templates</span>
                    </button>
                    <button 
                      onClick={() => addNotification("Export preview generated", "success")}
                      className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Export Templates */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-4">Export Templates</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'executive',
                        name: 'Executive Summary',
                        description: 'High-level insights and KPIs for leadership',
                        icon: Award,
                        color: 'purple',
                        features: ['Key insights', 'Charts', 'Executive summary', 'Recommendations']
                      },
                      {
                        id: 'technical',
                        name: 'Technical Report',
                        description: 'Detailed analysis with methodology and data',
                        icon: Database,
                        color: 'blue',
                        features: ['Full dataset', 'Methodology', 'Statistical analysis', 'Raw data']
                      },
                      {
                        id: 'presentation',
                        name: 'Presentation Ready',
                        description: 'Visual-focused export optimized for presentations',
                        icon: BarChart3,
                        color: 'green',
                        features: ['High-res charts', 'Key points', 'Visual storytelling', 'Speaker notes']
                      }
                    ].map((template, index) => (
                      <motion.button
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        onClick={() => {
                          addNotification(`${template.name} template selected`, "success");
                        }}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 bg-${template.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${template.color}-200 transition-colors`}>
                            <template.icon className={`w-5 h-5 text-${template.color}-600`} />
                          </div>
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900 mb-1">{template.name}</h6>
                            <p className="text-xs text-gray-600 mb-3">{template.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {template.features.map((feature, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Export Configuration */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Format & Content Selection */}
                  <div className="space-y-6">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-4">Export Configuration</h5>
                      
                      {/* Format Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { format: 'pdf', label: 'PDF Report', icon: FileText, popular: true },
                            { format: 'excel', label: 'Excel Workbook', icon: Database, popular: true },
                            { format: 'powerpoint', label: 'PowerPoint', icon: BarChart3, popular: false },
                            { format: 'json', label: 'JSON Data', icon: Sparkles, popular: false }
                          ].map((option) => (
                            <label key={option.format} className="relative cursor-pointer">
                              <input
                                type="radio"
                                name="exportFormat"
                                value={option.format}
                                className="sr-only peer"
                              />
                              <div className="flex items-center p-3 border-2 border-gray-200 rounded-lg peer-checked:border-pink-500 peer-checked:bg-pink-50 hover:bg-gray-50 transition-all">
                                <option.icon className="w-4 h-4 text-gray-500 peer-checked:text-pink-600 mr-2" />
                                <span className="text-sm font-medium text-gray-700 peer-checked:text-pink-700">
                                  {option.label}
                                </span>
                                {option.popular && (
                                  <span className="ml-auto text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full">
                                    Popular
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Content Inclusion */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Include in Export</label>
                        <div className="space-y-3">
                          {[
                            { id: 'data', label: 'Raw Data', description: 'Original and transformed datasets' },
                            { id: 'insights', label: 'AI Insights', description: 'Generated patterns and recommendations' },
                            { id: 'charts', label: 'Visualizations', description: 'All created charts and graphs' },
                            { id: 'metadata', label: 'Metadata', description: 'Processing info and timestamps' }
                          ].map((option) => (
                            <label key={option.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                defaultChecked={option.id !== 'metadata'}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{option.label}</div>
                                <div className="text-sm text-gray-600">{option.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings & Scheduling */}
                  <div className="space-y-6">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-4">Advanced Settings</h5>
                      
                      {/* Quality & Size Settings */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                        <h6 className="font-medium text-gray-900 mb-3">Quality & Performance</h6>
                        <div className="space-y-4">
                          <div>
                            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                              Image Quality
                              <span className="text-xs text-gray-500">Higher quality = larger file</span>
                            </label>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-gray-500">Low</span>
                              <input
                                type="range"
                                min="1"
                                max="5"
                                defaultValue="4"
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-xs text-gray-500">High</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                defaultChecked
                              />
                              <span className="text-sm text-gray-700">Compress images</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                              />
                              <span className="text-sm text-gray-700">Include raw data</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Scheduling */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-medium text-blue-900">Export Scheduling</h6>
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="schedule"
                              value="now"
                              className="text-blue-600"
                              defaultChecked
                            />
                            <span className="text-sm text-blue-800">Export now</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="schedule"
                              value="scheduled"
                              className="text-blue-600"
                            />
                            <span className="text-sm text-blue-800">Schedule for later</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="schedule"
                              value="recurring"
                              className="text-blue-600"
                            />
                            <span className="text-sm text-blue-800">Recurring export</span>
                          </label>
                        </div>
                        <div className="mt-3 p-3 bg-blue-100/50 rounded-lg">
                          <div className="flex items-center space-x-2 text-xs text-blue-700">
                            <Bell className="w-3 h-3" />
                            <span>Get notified when export is ready</span>
                          </div>
                        </div>
                      </div>

                      {/* Security Options */}
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-medium text-green-900">Security Options</h6>
                          <Shield className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-green-800">Password protect file</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-green-800">Watermark documents</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-green-800">Expiring download links</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Actions */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => addNotification("Export saved as draft", "info")}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Save as Draft</span>
                      </button>
                      <button 
                        onClick={() => addNotification("Export settings reset", "info")}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => addNotification("Export preview generated successfully", "success")}
                        className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview Export</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExport({
                            format: 'pdf',
                            title: selectedFile?.name || 'Data Analysis',
                            includeData: true,
                            includeInsights: true,
                            includeCharts: true,
                            template: 'executive'
                          });
                          addNotification("Export started successfully", "success");
                        }}
                        className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Generate Export</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legacy Export System (Hidden by default) */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Show basic export options
                  </summary>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <LazyExportSystem
                      data={transformedData.length > 0 ? transformedData : selectedFile?.preview || []}
                      charts={charts}
                      insights={insights}
                      statistics={statistics}
                      fileName={selectedFile?.name || 'Data Analysis'}
                      onExport={handleExport}
                      onShare={handleShare}
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Notifications */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                className={`p-4 rounded-xl shadow-xl border max-w-sm ${
                  notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.message}</p>
                  </div>
                  <button 
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 rounded-3xl -z-10"></div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent mb-2">
              Data Analysis Workflow
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload, analyze, and visualize your data with AI-powered insights and comprehensive reporting
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(workflowProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${workflowProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTips(!showTips)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showTips 
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-200'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-purple-50 hover:border-purple-200'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Tips</span>
              </button>
              
              <button
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  autoAdvance 
                    ? 'bg-green-100 text-green-700 border-2 border-green-200'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-green-50 hover:border-green-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Auto-advance</span>
              </button>

              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Advanced</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Analyst</span>
              </div>
              <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-purple-600 transition-colors">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Tips Panel */}
          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900 mb-2">
                        Tips for {workflowSteps.find(s => s.id === currentStep)?.name}
                      </h4>
                      <ul className="space-y-1 text-sm text-purple-700">
                        {getStepTips(currentStep).map((tip, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <Star className="w-3 h-3 text-purple-500 mt-1 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { 
            title: 'Files Uploaded', 
            value: uploadedFiles.length.toString(), 
            icon: FileText, 
            color: 'blue' 
          },
          { 
            title: 'Insights Generated', 
            value: insights.length.toString(), 
            icon: Sparkles, 
            color: 'purple' 
          },
          { 
            title: 'Transformations', 
            value: transformations.length.toString(), 
            icon: Activity, 
            color: 'green' 
          },
          { 
            title: 'Visualizations', 
            value: charts.length.toString(), 
            icon: TrendingUp, 
            color: 'orange' 
          }
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Enhanced Workflow Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">Workflow Progress</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filter</span>
            </button>
            <button 
              onClick={() => setCurrentStep('upload')}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Advanced Options Panel */}
        <AnimatePresence>
          {showAdvancedOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100"
            >
              <h3 className="font-semibold text-indigo-900 mb-4">Advanced Workflow Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          addNotification("Validation mode enabled", "success");
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">Enable strict validation</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          addNotification("Auto-save enabled", "info");
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">Auto-save progress</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Parallel processing</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Memory optimization</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <button 
                    onClick={() => addNotification("Workflow template saved", "success")}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span className="text-sm">Save as Template</span>
                  </button>
                  <button 
                    onClick={() => addNotification("Workflow configuration exported", "info")}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Export Config</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modern Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {workflowSteps.map((step, index) => {
            const status = getStepStatus(step.id);
            const canProceed = canProceedToStep(step.id);
            const IconComponent = step.icon;
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                <motion.button
                  onClick={() => canProceed && setCurrentStep(step.id)}
                  disabled={!canProceed}
                  whileHover={canProceed ? { scale: 1.02 } : {}}
                  whileTap={canProceed ? { scale: 0.98 } : {}}
                  className={`relative w-full p-6 rounded-2xl transition-all duration-300 ${
                    status === 'current'
                      ? `bg-gradient-to-r ${step.gradient} text-white shadow-lg shadow-purple-200/50`
                      : status === 'completed'
                      ? 'bg-green-50 border-2 border-green-200 hover:bg-green-100 hover:shadow-lg hover:shadow-green-200/30'
                      : canProceed
                      ? 'bg-gray-50 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg'
                      : 'bg-gray-50 border-2 border-gray-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Step Number with Animation */}
                  <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    status === 'completed'
                      ? 'bg-green-500 text-white shadow-lg'
                      : status === 'current'
                      ? 'bg-white text-purple-600 shadow-lg animate-pulse'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Icon with Enhanced Animation */}
                  <div className={`mb-4 p-3 rounded-xl transition-all duration-300 ${
                    status === 'current'
                      ? 'bg-white/20'
                      : status === 'completed'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`w-6 h-6 transition-all duration-300 ${
                      status === 'current'
                        ? 'text-white'
                        : status === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`} />
                  </div>

                  {/* Enhanced Content */}
                  <div className="text-left">
                    <h3 className={`font-semibold mb-2 transition-colors duration-300 ${
                      status === 'current' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {step.name}
                    </h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      status === 'current' ? 'text-white/80' : 'text-gray-600'
                    }`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Enhanced Progress Indicator */}
                  {status === 'current' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
                      <motion.div 
                        className="h-full bg-white rounded-b-2xl"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ 
                          duration: autoAdvance ? 2 : 4,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    </div>
                  )}
                </motion.button>

                {/* Step Actions */}
                {status === 'current' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                  >
                    <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1 shadow-lg border">
                      {loading ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      ) : (
                        <>
                          <button className="w-6 h-6 text-purple-600 hover:text-purple-800 transition-colors">
                            <Play className="w-3 h-3" />
                          </button>
                          <button className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors">
                            <Pause className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Connection Lines */}
        <div className="hidden md:block absolute top-[180px] left-8 right-8 h-0.5 bg-gray-200 -z-10">
          {workflowSteps.map((_, index) => {
            if (index === workflowSteps.length - 1) return null;
            const status = getStepStatus(workflowSteps[index + 1].id);
            return (
              <div
                key={index}
                className={`absolute top-0 h-full transition-colors duration-500 ${
                  status === 'completed' || status === 'current' ? 'bg-green-400' : 'bg-gray-200'
                }`}
                style={{
                  left: `${((index + 1) / workflowSteps.length) * 100}%`,
                  width: `${(1 / workflowSteps.length) * 100}%`
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Step Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20"
      >
        <div className="p-8">
          {renderStepContent()}
        </div>
      </motion.div>

      {/* Enhanced Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0"
      >
        <button
          onClick={() => {
            const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
            if (currentIndex > 0) {
              setCurrentStep(workflowSteps[currentIndex - 1].id);
            }
          }}
          disabled={currentStep === 'upload'}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Previous Step</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            Step {workflowSteps.findIndex(step => step.id === currentStep) + 1} of {workflowSteps.length}
          </div>
          <div className="flex space-x-2">
            {workflowSteps.map((step, index) => {
              const status = getStepStatus(step.id);
              return (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'current' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => {
            const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
            if (currentIndex < workflowSteps.length - 1) {
              const nextStep = workflowSteps[currentIndex + 1];
              if (canProceedToStep(nextStep.id)) {
                setCurrentStep(nextStep.id);
              }
            }
          }}
          disabled={currentStep === 'export' || !canProceedToStep(
            workflowSteps[workflowSteps.findIndex(step => step.id === currentStep) + 1]?.id
          )}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <span>Next Step</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
};

export default DataAnalysisWorkflow;

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Database, BarChart3, Brain, Download, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import FileUploadSystem from './FileUploadSystem';
import DataManipulation from './DataManipulation';
import InsightsGeneration from './InsightsGeneration';
import VisualizationDashboard from './VisualizationDashboard';
import ExportSystem from './ExportSystem';

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

  const workflowSteps = [
    {
      id: 'upload' as WorkflowStep,
      name: 'Upload Data',
      description: 'Upload and preview your data files',
      icon: Upload,
      color: 'blue'
    },
    {
      id: 'manipulate' as WorkflowStep,
      name: 'Transform Data',
      description: 'Clean, filter, and manipulate your data',
      icon: Database,
      color: 'green'
    },
    {
      id: 'analyze' as WorkflowStep,
      name: 'Generate Insights',
      description: 'Discover patterns and generate insights',
      icon: Brain,
      color: 'purple'
    },
    {
      id: 'visualize' as WorkflowStep,
      name: 'Create Visualizations',
      description: 'Build charts and dashboards',
      icon: BarChart3,
      color: 'orange'
    },
    {
      id: 'export' as WorkflowStep,
      name: 'Export Results',
      description: 'Export reports and share insights',
      icon: Download,
      color: 'red'
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
    console.log('Exporting with options:', options);

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
      console.error('Export failed:', error);
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
    console.log('Sharing with options:', options);
    // In production, this would implement actual sharing functionality
    alert(`Sharing via ${options.method} - Feature coming soon!`);
  }, []);

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
          <div className="space-y-6">
            <FileUploadSystem
              onFileUploaded={handleFileUploaded}
              onFileAnalyzed={(file) => console.log('File analyzed:', file)}
            />
            
            {uploadedFiles.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select File for Analysis</h3>
                <div className="space-y-3">
                  {uploadedFiles.filter(f => f.status === 'completed').map((file) => (
                    <label
                      key={file.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
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
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{file.name}</div>
                        <div className="text-sm text-gray-600">
                          {file.schema?.rowCount.toLocaleString()} rows, {file.schema?.columns.length} columns
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'manipulate':
        return selectedFile && selectedFile.schema ? (
          <DataManipulation
            data={selectedFile.preview || []}
            columns={selectedFile.schema.columns}
            onDataChanged={handleDataChanged}
            onExport={(data, format) => console.log('Export data:', { data, format })}
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please upload and select a file first</p>
          </div>
        );

      case 'analyze':
        return selectedFile && selectedFile.schema ? (
          <InsightsGeneration
            data={transformedData.length > 0 ? transformedData : selectedFile.preview || []}
            columns={selectedFile.schema.columns}
            onInsightGenerated={handleInsightGenerated}
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please upload and select a file first</p>
          </div>
        );

      case 'visualize':
        return selectedFile && selectedFile.schema ? (
          <VisualizationDashboard
            data={transformedData.length > 0 ? transformedData : selectedFile.preview || []}
            columns={selectedFile.schema.columns}
            onExportDashboard={(format) => console.log('Export dashboard:', format)}
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please upload and select a file first</p>
          </div>
        );

      case 'export':
        return (
          <ExportSystem
            data={transformedData.length > 0 ? transformedData : selectedFile?.preview || []}
            charts={charts}
            insights={insights}
            statistics={statistics}
            onExport={handleExport}
            onShare={handleShare}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Data Analysis Workflow</h1>
            <p className="mt-2 text-gray-600">
              Upload, analyze, and visualize your data with comprehensive insights and reporting
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, index) => {
              const status = getStepStatus(step.id);
              const canProceed = canProceedToStep(step.id);
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => canProceed && setCurrentStep(step.id)}
                    disabled={!canProceed}
                    className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                      canProceed
                        ? 'hover:bg-gray-50 cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                    } ${status === 'current' ? 'bg-blue-50' : ''}`}
                  >
                    <div className="mb-2">
                      {getStepIcon(step, status)}
                    </div>
                    <div className="text-sm font-medium text-gray-900 text-center">
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-600 text-center mt-1">
                      {step.description}
                    </div>
                  </button>
                  
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => {
              const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(workflowSteps[currentIndex - 1].id);
              }
            }}
            disabled={currentStep === 'upload'}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Previous</span>
          </button>
          
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
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataAnalysisWorkflow;

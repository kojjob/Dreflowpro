'use client';

import { useState, useEffect } from 'react';
import FileUpload from '../../components/upload/FileUpload';
import DataVisualization from '../../components/visualizations/DataVisualization';
import { toast } from 'sonner';
import { ArrowLeft, Download, Eye, Zap, Filter, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { PREVIEW_CONFIG, API_CONFIG } from '../../config/dataConfig';
import { apiService } from '../../services/api';
import { PreferencesManager } from '../../utils/preferences';

interface TransformationOption {
  type: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  config_schema?: any;
}

export default function DataUploadPage() {
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [transformationOptions, setTransformationOptions] = useState<TransformationOption[]>([]);
  const [previewPageSize, setPreviewPageSize] = useState(PREVIEW_CONFIG.pageSize);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return PreferencesManager.getPreferences().dataPreview.itemsPerPage;
  });

  // Load transformation options dynamically
  useEffect(() => {
    const loadTransformationOptions = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const response = await apiService.getTransformationOptions();
          if (response.success) {
            setTransformationOptions(response.transformations.filter((t: TransformationOption) => t.enabled));
          }
        }
      } catch (error) {
        console.warn('Failed to load transformation options, using defaults:', error);
        // Fallback to default transformations
        setTransformationOptions([
          {
            type: 'deduplicate',
            name: 'Remove Duplicates',
            description: 'Remove duplicate rows from your data',
            icon: 'Zap',
            enabled: true
          },
          {
            type: 'validate',
            name: 'Data Validation',
            description: 'Validate and clean your data',
            icon: 'Eye',
            enabled: true
          },
          {
            type: 'aggregate',
            name: 'Aggregate Data',
            description: 'Group and summarize your data',
            icon: 'Download',
            enabled: true
          }
        ]);
      }
    };

    loadTransformationOptions();
  }, []);

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'Zap': <Zap className="h-5 w-5" />,
      'Eye': <Eye className="h-5 w-5" />,
      'Download': <Download className="h-5 w-5" />,
      'Filter': <Filter className="h-5 w-5" />,
      'ArrowUpDown': <ArrowUpDown className="h-5 w-5" />,
    };
    return icons[iconName] || <Zap className="h-5 w-5" />;
  };

  const handleFileUploaded = (result: any) => {
    setUploadResult(result);
    toast.success(`File "${result.file_info.filename}" uploaded successfully!`);
  };

  const handleUploadError = (error: string) => {
    toast.error(error);
  };

  const handlePreview = async () => {
    if (!uploadResult?.file_id) return;

    try {
      const token = localStorage.getItem('access_token');
      
      const previewRows = PREVIEW_CONFIG.defaultRows;
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/v1/data/files/${uploadResult.file_id}/preview?rows=${previewRows}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch preview');
      }

      const data = await response.json();
      setPreviewData(data);
      setCurrentPage(0); // Reset to first page when new data loads
      setShowPreview(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch preview');
    }
  };

  const handleTransformation = async (transformationType: string) => {
    if (!uploadResult?.file_id) return;

    try {
      const token = localStorage.getItem('access_token');
      
      const transformationConfig = {
        type: transformationType,
        config: {} // Basic config, can be enhanced later
      };

      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/v1/data/files/${uploadResult.file_id}/transform`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(transformationConfig),
        }
      );

      if (!response.ok) {
        throw new Error('Transformation failed');
      }

      const result = await response.json();
      toast.success(`${transformationType} transformation completed successfully!`);
      
      // You could update the visualization with the transformed data here
      console.log('Transformation result:', result);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Transformation failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Upload & Analysis</h1>
                <p className="text-gray-600">Upload your data files and get instant insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* File Upload Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Your Data File
            </h2>
            <FileUpload
              onFileUploaded={handleFileUploaded}
              onError={handleUploadError}
            />
            
            {uploadResult && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handlePreview} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Data
                </Button>
                
                {transformationOptions.map((option) => (
                  <Button
                    key={option.type}
                    onClick={() => handleTransformation(option.type)}
                    variant="outline"
                  >
                    {getIconComponent(option.icon)}
                    <span className="ml-2">{option.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Data Preview Modal */}
          {showPreview && previewData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-6xl max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold">Data Preview</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="p-4 overflow-auto max-h-[60vh]">
                  {previewData.preview_data && previewData.preview_data.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(previewData.preview_data[0]).map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.preview_data
                            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                            .map((row: any, index: number) => (
                            <tr key={currentPage * itemsPerPage + index}>
                              {Object.values(row).map((value: any, cellIndex: number) => (
                                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">No data to preview</p>
                  )}
                </div>
                
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600">
                        Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, previewData.preview_data.length)} of {previewData.preview_data.length} rows
                      </p>
                      <select 
                        value={itemsPerPage} 
                        onChange={(e) => {
                          const newItemsPerPage = parseInt(e.target.value);
                          setItemsPerPage(newItemsPerPage);
                          setCurrentPage(0);
                          PreferencesManager.updateDataPreviewPreferences({ 
                            itemsPerPage: newItemsPerPage 
                          });
                        }}
                        className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage + 1} of {Math.ceil(previewData.preview_data.length / itemsPerPage)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(Math.ceil(previewData.preview_data.length / itemsPerPage) - 1, currentPage + 1))}
                        disabled={currentPage >= Math.ceil(previewData.preview_data.length / itemsPerPage) - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualizations Section */}
          {uploadResult && (
            <DataVisualization
              fileId={uploadResult.file_id}
              uploadResult={uploadResult}
            />
          )}
        </div>
      </div>
    </div>
  );
}
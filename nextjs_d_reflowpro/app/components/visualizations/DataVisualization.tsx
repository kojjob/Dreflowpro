'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, Scatter, Radar } from 'react-chartjs-2';
import { TrendingUp, Database, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { VISUALIZATION_CONFIG, QUALITY_CONFIG, CHART_COMPATIBILITY, getQualityColor, getQualityLabel } from '../../config/dataConfig';
import { apiService } from '../../services/api';
import ChartTypeSelector from '../ui/ChartTypeSelector';
import { PreferencesManager } from '../../utils/preferences';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
  RadialLinearScale
);

interface DataVisualizationProps {
  fileId: string;
  uploadResult?: any;
}

interface AnalysisData {
  basic_stats: any;
  column_analysis: any[];
  data_quality: any;
  visualizations: any;
}

export default function DataVisualization({ fileId, uploadResult }: DataVisualizationProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSelectedChartTypes, setUserSelectedChartTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (uploadResult?.data_analysis) {
      setAnalysis(uploadResult.data_analysis);
    } else {
      fetchAnalysis();
    }
  }, [fileId, uploadResult]);

  // Load user's chart type preferences on component mount
  useEffect(() => {
    const preferences = PreferencesManager.getPreferences();
    if (preferences.visualizationPreferences.rememberChartChoices) {
      setUserSelectedChartTypes(preferences.visualizationPreferences.chartTypePreferences);
    }
  }, []);

  // Save chart type preferences when they change
  const handleChartTypeChange = (vizKey: string, newType: string) => {
    const newPreferences = { ...userSelectedChartTypes, [vizKey]: newType };
    setUserSelectedChartTypes(newPreferences);
    
    // Save to preferences
    const preferences = PreferencesManager.getPreferences();
    if (preferences.visualizationPreferences.rememberChartChoices) {
      PreferencesManager.updateVisualizationPreferences({
        chartTypePreferences: {
          ...preferences.visualizationPreferences.chartTypePreferences,
          [`${fileId}_${vizKey}`]: newType
        }
      });
    }
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const result = await apiService.analyzeFile(fileId);
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Analyzing data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const { basic_stats, column_analysis, data_quality, visualizations } = analysis;

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const renderChart = (viz: any, vizKey: string, index: number) => {
    if (!viz || !viz.data) return null;
    
    // Determine chart type: user selection > saved preference > backend suggestion > default
    const userSelection = userSelectedChartTypes[vizKey];
    const savedPreference = PreferencesManager.getPreferences().visualizationPreferences.chartTypePreferences[`${fileId}_${vizKey}`];
    const backendSuggestion = viz?.type || 'bar';
    const chartType = userSelection || savedPreference || backendSuggestion;
    
    // Generate chart data based on the selected chart type
    const generateChartData = (type: string) => {
      const baseData = {
        labels: viz.data?.labels || [],
        datasets: [
          {
            label: viz.title || 'Chart',
            data: viz.data?.values || [],
            backgroundColor: VISUALIZATION_CONFIG.colorPalette,
            borderColor: VISUALIZATION_CONFIG.colorPalette.map(color => color.replace('0.8', '1')),
            borderWidth: type === 'line' ? 2 : 1,
          },
        ],
      };

      // Special data formatting for different chart types
      switch (type) {
        case 'scatter':
          // Convert to x,y coordinate pairs for scatter plot
          return {
            datasets: [
              {
                label: viz.title || 'Scatter Plot',
                data: viz.data?.values?.map((value: number, idx: number) => ({
                  x: idx,
                  y: value
                })) || [],
                backgroundColor: VISUALIZATION_CONFIG.colorPalette[0],
                borderColor: VISUALIZATION_CONFIG.colorPalette[0].replace('0.8', '1'),
              },
            ],
          };

        case 'radar':
          return {
            labels: viz.data?.labels || [],
            datasets: [
              {
                label: viz.title || 'Radar Chart',
                data: viz.data?.values || [],
                backgroundColor: VISUALIZATION_CONFIG.colorPalette[0].replace('0.8', '0.2'),
                borderColor: VISUALIZATION_CONFIG.colorPalette[0],
                borderWidth: 2,
                pointBackgroundColor: VISUALIZATION_CONFIG.colorPalette[0],
              },
            ],
          };

        default:
          return baseData;
      }
    };

    // Generate chart-specific options
    const generateChartOptions = (type: string) => {
      const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
          },
          tooltip: {
            enabled: true,
          },
        },
      };

      switch (type) {
        case 'line':
          return {
            ...baseOptions,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
            elements: {
              line: {
                tension: 0.3, // Smooth curves
              },
            },
          };

        case 'scatter':
          return {
            ...baseOptions,
            scales: {
              x: {
                type: 'linear' as const,
                position: 'bottom' as const,
              },
              y: {
                beginAtZero: true,
              },
            },
          };

        case 'radar':
          return {
            ...baseOptions,
            scales: {
              r: {
                beginAtZero: true,
              },
            },
          };

        case 'pie':
        case 'doughnut':
          return {
            ...baseOptions,
            plugins: {
              ...baseOptions.plugins,
              legend: {
                position: 'right' as const,
              },
            },
          };

        default:
          return baseOptions;
      }
    };

    const chartData = generateChartData(chartType);
    const options = generateChartOptions(chartType);

    // Render the appropriate chart component
    const renderChartComponent = () => {
      const key = `${vizKey}_${chartType}_${index}`;
      
      switch (chartType) {
        case 'bar':
        case 'histogram':
          return <Bar key={key} data={chartData} options={options} />;
        case 'line':
          return <Line key={key} data={chartData} options={options} />;
        case 'pie':
          return <Pie key={key} data={chartData} options={options} />;
        case 'doughnut':
          return <Doughnut key={key} data={chartData} options={options} />;
        case 'scatter':
          return <Scatter key={key} data={chartData} options={options} />;
        case 'radar':
          return <Radar key={key} data={chartData} options={options} />;
        default:
          return <Bar key={key} data={chartData} options={options} />;
      }
    };

    return renderChartComponent();
  };

  const getQualityIcon = (score: number) => {
    if (score >= QUALITY_CONFIG.scoreThresholds.good) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= QUALITY_CONFIG.scoreThresholds.fair) return <Info className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Rows</p>
              <p className="text-2xl font-bold text-gray-900">
                {basic_stats?.row_count?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Columns</p>
              <p className="text-2xl font-bold text-gray-900">{basic_stats?.column_count || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Missing Values</p>
              <p className="text-2xl font-bold text-gray-900">{basic_stats?.total_null_count || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            {getQualityIcon(data_quality?.quality_score || 0)}
            <div className="ml-2">
              <p className="text-sm text-gray-600">Quality Score</p>
              <p className={`text-2xl font-bold ${getQualityColor(data_quality?.quality_score || 0)}`}>
                {data_quality?.quality_score || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Assessment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Completeness</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${data_quality?.completeness_percentage || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-900 mt-1">{data_quality?.completeness_percentage || 0}%</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Uniqueness</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${data_quality?.uniqueness_percentage || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-900 mt-1">{data_quality?.uniqueness_percentage || 0}%</p>
          </div>
        </div>

        {data_quality?.issues && data_quality.issues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">Issues Found:</h4>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {data_quality.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {data_quality?.recommendations && data_quality.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Recommendations:</h4>
            <ul className="list-disc list-inside text-sm text-blue-700">
              {data_quality.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Visualizations */}
      {visualizations && Object.keys(visualizations).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Visualizations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(visualizations).map(([key, viz]: [string, any], index) => {
              const currentChartType = userSelectedChartTypes[key] || 
                PreferencesManager.getPreferences().visualizationPreferences.chartTypePreferences[`${fileId}_${key}`] || 
                viz?.type || 'bar';
              const suggestedChartType = CHART_COMPATIBILITY.getRecommendedChartType('categorical', viz.data?.labels?.length || 0);

              return (
                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{viz?.title || 'Visualization'}</h4>
                    <ChartTypeSelector
                      currentType={currentChartType}
                      visualizationData={viz}
                      onTypeChange={(newType) => handleChartTypeChange(key, newType)}
                      suggestedType={suggestedChartType !== currentChartType ? suggestedChartType : undefined}
                      className="ml-auto"
                    />
                  </div>
                  <div className="h-64">
                    {renderChart(viz, key, index)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Column Analysis */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Analysis</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Column Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing Values
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Values
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sample Values
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {column_analysis?.map((col: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {col?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {col?.analysis_type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {col?.null_count || 0} ({col?.null_percentage?.toFixed(1) || 0}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {col?.unique_count || 0} ({col?.unique_percentage?.toFixed(1) || 0}%)
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {col?.sample_values?.join(', ') || 'No samples'}
                  </td>
                </tr>
              )) || []}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
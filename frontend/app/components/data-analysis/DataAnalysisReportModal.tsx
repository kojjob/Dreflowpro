'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, BarChart3, TrendingUp, PieChart, Activity,
  Download, Share2, Calendar, Users, Target, AlertCircle,
  CheckCircle, Info, Zap, Eye, Database, Filter, ArrowUp,
  ArrowDown, Minus, Plus, RefreshCw, Settings, Maximize2
} from 'lucide-react';
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
import { Modal } from '../ui/Modal';
import InteractiveChart from './InteractiveChart';
import ReportLayoutSystem, { createKPISection, createInsightsSection, createDataQualitySection } from './ReportLayoutSystem';
import { MetricCard, StatusBadge, DataAnalysisIcons, getDataTypeColor } from './IconSystem';
import { DreflowDesignSystem, ComponentStyles, getStatusColor, getChartColor } from './DesignSystem';

// Register Chart.js components
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

interface DataAnalysisReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  insights: any[];
  statistics: any[];
  charts: any[];
  fileName?: string;
  onExport?: (format: string) => void;
  onShare?: () => void;
}

interface KPIMetric {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
}

interface ReportSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  priority: number;
}

const DataAnalysisReportModal: React.FC<DataAnalysisReportModalProps> = ({
  isOpen,
  onClose,
  data,
  insights,
  statistics,
  charts,
  fileName = 'Data Analysis',
  onExport,
  onShare
}) => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // DreflowPro color palette from design system
  const colorPalette = DreflowDesignSystem.colors.chart;

  // Generate KPI metrics from data and statistics
  const kpiMetrics = useMemo((): KPIMetric[] => {
    const metrics: KPIMetric[] = [
      {
        id: 'total-records',
        title: 'Total Records',
        value: data.length.toLocaleString(),
        icon: Database,
        color: 'text-brand-600',
        description: 'Total number of data records analyzed'
      },
      {
        id: 'data-quality',
        title: 'Data Quality Score',
        value: statistics.find(s => s.type === 'quality')?.score || 85,
        change: 5,
        changeType: 'increase',
        icon: CheckCircle,
        color: 'text-green-600',
        description: 'Overall data quality assessment'
      },
      {
        id: 'insights-generated',
        title: 'Insights Generated',
        value: insights.length,
        icon: Zap,
        color: 'text-purple-600',
        description: 'AI-generated insights and recommendations'
      },
      {
        id: 'visualizations',
        title: 'Visualizations',
        value: charts.length,
        icon: BarChart3,
        color: 'text-blue-600',
        description: 'Interactive charts and graphs created'
      }
    ];

    // Add dynamic metrics based on data analysis
    if (statistics.length > 0) {
      const completenessMetric = statistics.find(s => s.type === 'completeness');
      if (completenessMetric) {
        metrics.push({
          id: 'completeness',
          title: 'Data Completeness',
          value: `${completenessMetric.percentage}%`,
          change: completenessMetric.change,
          changeType: completenessMetric.change > 0 ? 'increase' : 'decrease',
          icon: Target,
          color: 'text-indigo-600',
          description: 'Percentage of complete data records'
        });
      }
    }

    return metrics;
  }, [data, insights, statistics, charts]);

  // Process chart data for enhanced visualization
  const processedCharts = useMemo(() => {
    return charts.map((chart, index) => {
      if (!chart.data) return chart;

      // Apply DreflowPro color palette to chart data
      const colors = [
        colorPalette.primary,
        colorPalette.secondary,
        colorPalette.success,
        colorPalette.warning,
        colorPalette.danger,
        colorPalette.purple,
        colorPalette.pink,
        colorPalette.indigo,
      ];

      const processedData = {
        ...chart.data,
        datasets: chart.data.datasets?.map((dataset: any, datasetIndex: number) => ({
          ...dataset,
          backgroundColor: colors[datasetIndex % colors.length],
          borderColor: colors[datasetIndex % colors.length].replace('0.8', '1'),
          borderWidth: 2,
          borderRadius: chart.type === 'bar' ? 8 : 0,
          tension: chart.type === 'line' ? 0.4 : 0,
        })) || []
      };

      return {
        ...chart,
        data: processedData
      };
    });
  }, [charts, colorPalette]);

  // Generate sample data if no charts are provided
  const sampleCharts = useMemo(() => {
    if (charts.length > 0) return [];

    const sampleData = [
      {
        type: 'bar',
        title: 'Data Distribution',
        data: {
          labels: ['Category A', 'Category B', 'Category C', 'Category D'],
          datasets: [{
            label: 'Count',
            data: [12, 19, 8, 15],
            backgroundColor: colorPalette.primary,
            borderColor: colorPalette.primary.replace('0.8', '1'),
            borderWidth: 2,
            borderRadius: 8,
          }]
        },
        description: 'Distribution of data across different categories'
      },
      {
        type: 'line',
        title: 'Trend Analysis',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Trend',
            data: [65, 59, 80, 81, 56, 55],
            backgroundColor: colorPalette.secondary,
            borderColor: colorPalette.secondary.replace('0.8', '1'),
            borderWidth: 2,
            tension: 0.4,
          }]
        },
        description: 'Temporal trends in the dataset'
      }
    ];

    return sampleData;
  }, [charts.length, colorPalette]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isFullscreen ? "full" : "xl"}
      className="max-h-[95vh] overflow-hidden"
      showCloseButton={false}
      title="Data Analysis Report"
      description={`Comprehensive analysis report for ${fileName}`}
    >
      <div className={`${DreflowDesignSystem.gradients.main} min-h-full`}>
        {/* Header */}
        <div className={`${ComponentStyles.modal.header}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-brand-600 bg-clip-text text-transparent">
                  Data Analysis Report
                </h2>
                <p className="text-gray-600 text-sm">{fileName} • Generated {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              
              {onShare && (
                <button
                  onClick={onShare}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              )}
              
              {onExport && (
                <button
                  onClick={() => onExport('pdf')}
                  className="flex items-center space-x-2 px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`${DreflowDesignSystem.gradients.card} ${DreflowDesignSystem.blur.card} ${DreflowDesignSystem.borders.divider} px-6`}>
          <nav role="tablist" aria-label="Report sections" className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'insights', label: 'Insights', icon: Zap },
              { id: 'visualizations', label: 'Charts', icon: BarChart3 },
              { id: 'statistics', label: 'Statistics', icon: Activity },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeSection === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => setActiveSection(tab.id)}
                  className={`${ComponentStyles.nav.tab} ${
                    activeSection === tab.id
                      ? ComponentStyles.nav.tabActive
                      : ComponentStyles.nav.tabInactive
                  } focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 whitespace-nowrap`}
                >
                  <IconComponent className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              role="tabpanel"
              id={`${activeSection}-panel`}
              aria-labelledby={`${activeSection}-tab`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {kpiMetrics.map((metric, index) => {
                      const IconComponent = metric.icon;
                      return (
                        <motion.div
                          key={metric.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-r ${
                              metric.color.includes('brand') ? 'from-brand-100 to-brand-200' :
                              metric.color.includes('green') ? 'from-green-100 to-green-200' :
                              metric.color.includes('purple') ? 'from-purple-100 to-purple-200' :
                              metric.color.includes('blue') ? 'from-blue-100 to-blue-200' :
                              'from-indigo-100 to-indigo-200'
                            }`}>
                              <IconComponent className={`w-6 h-6 ${metric.color}`} />
                            </div>
                            {metric.change && (
                              <div className={`flex items-center space-x-1 text-sm ${
                                metric.changeType === 'increase' ? 'text-green-600' :
                                metric.changeType === 'decrease' ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {metric.changeType === 'increase' ? <ArrowUp className="w-3 h-3" /> :
                                 metric.changeType === 'decrease' ? <ArrowDown className="w-3 h-3" /> :
                                 <Minus className="w-3 h-3" />}
                                <span>{Math.abs(metric.change)}%</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
                            <div className="text-sm font-medium text-gray-700 mb-2">{metric.title}</div>
                            {metric.description && (
                              <div className="text-xs text-gray-500">{metric.description}</div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Executive Summary */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <p>
                        Analysis of <strong>{data.length.toLocaleString()}</strong> records from {fileName} reveals
                        {insights.length > 0 && ` ${insights.length} key insights`}
                        {charts.length > 0 && ` with ${charts.length} visualizations`}
                        generated to support data-driven decision making.
                      </p>
                      {statistics.length > 0 && (
                        <p>
                          Data quality assessment shows an overall score of{' '}
                          <strong>{statistics.find(s => s.type === 'quality')?.score || 85}%</strong>,
                          indicating {statistics.find(s => s.type === 'quality')?.score >= 80 ? 'high' : 'moderate'} data reliability.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Insights Preview */}
                  {insights.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                          <Zap className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Key Insights Preview</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insights.slice(0, 4).map((insight, index) => (
                          <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">{insight.title || `Insight ${index + 1}`}</h4>
                                <p className="text-sm text-gray-600">{insight.description || insight.summary || 'Data pattern identified'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {insights.length > 4 && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setActiveSection('insights')}
                            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                          >
                            View all {insights.length} insights →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'insights' && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                        <Zap className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">AI-Generated Insights</h3>
                    </div>

                    {insights.length > 0 ? (
                      <div className="space-y-4">
                        {insights.map((insight, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100"
                          >
                            <div className="flex items-start space-x-4">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  {insight.title || `Insight ${index + 1}`}
                                </h4>
                                <p className="text-gray-700 mb-3">
                                  {insight.description || insight.summary || 'Data pattern identified through analysis'}
                                </p>
                                {insight.confidence && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Confidence:</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                                      <div
                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                                        style={{ width: `${insight.confidence}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{insight.confidence}%</span>
                                  </div>
                                )}
                                {insight.impact && (
                                  <div className="mt-2">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                      insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                                      insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {insight.impact} impact
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No insights generated yet. Run analysis to discover patterns in your data.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'visualizations' && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Interactive Visualizations</h3>
                    </div>

                    {(processedCharts.length > 0 || sampleCharts.length > 0) ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                        {(processedCharts.length > 0 ? processedCharts : sampleCharts).map((chart, index) => (
                          <InteractiveChart
                            key={index}
                            type={chart.type}
                            data={chart.data}
                            title={chart.title || `Chart ${index + 1}`}
                            description={chart.description}
                            height={320}
                            showControls={true}
                            onExport={(format) => {
                              console.log(`Exporting chart ${index + 1} as ${format}`);
                              // Implement export functionality
                            }}
                            className="transition-all duration-300 hover:shadow-2xl"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No visualizations available. Generate charts from your data analysis.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'statistics' && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-gradient-to-r from-green-100 to-green-200 rounded-lg">
                        <Activity className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Statistical Analysis</h3>
                    </div>

                    {statistics.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {statistics.map((stat, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100"
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                                <Activity className="w-4 h-4 text-white" />
                              </div>
                              <h4 className="font-medium text-gray-900">{stat.name || stat.type || 'Statistic'}</h4>
                            </div>
                            <div className="space-y-2">
                              <div className="text-2xl font-bold text-gray-900">{stat.value || stat.score || 'N/A'}</div>
                              {stat.description && (
                                <p className="text-sm text-gray-600">{stat.description}</p>
                              )}
                              {stat.details && (
                                <div className="text-xs text-gray-500 space-y-1">
                                  {Object.entries(stat.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key.replace('_', ' ')}:</span>
                                      <span className="font-medium">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No statistical analysis available. Run data analysis to generate statistics.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};

export default DataAnalysisReportModal;

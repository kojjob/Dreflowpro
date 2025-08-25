'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Target, Brain, Download, RefreshCw } from 'lucide-react';

interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  samples: any[];
}

interface StatisticalSummary {
  column: string;
  type: string;
  count: number;
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  mode?: any;
  stdDev?: number;
  min?: any;
  max?: any;
  q1?: number;
  q3?: number;
  distribution?: { value: any; count: number; percentage: number }[];
}

interface DataQualityMetric {
  metric: string;
  value: number;
  status: 'good' | 'warning' | 'error';
  description: string;
  recommendation?: string;
}

interface Correlation {
  column1: string;
  column2: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative';
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

interface InsightsGenerationProps {
  data: any[];
  columns: DataColumn[];
  onInsightGenerated?: (insights: Insight[]) => void;
}

const InsightsGeneration: React.FC<InsightsGenerationProps> = ({
  data,
  columns,
  onInsightGenerated
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  const calculateStatisticalSummary = (data: any[], column: DataColumn): StatisticalSummary => {
    const values = data.map(row => row[column.name]).filter(v => v != null && v !== '');
    const nullCount = data.length - values.length;
    const uniqueValues = [...new Set(values)];

    const summary: StatisticalSummary = {
      column: column.name,
      type: column.type,
      count: data.length,
      nullCount,
      uniqueCount: uniqueValues.length
    };

    if (column.type === 'number' && values.length > 0) {
      const numericValues = values.map(Number).filter(n => !isNaN(n));
      
      if (numericValues.length > 0) {
        const sorted = numericValues.sort((a, b) => a - b);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        
        summary.mean = sum / numericValues.length;
        summary.median = sorted[Math.floor(sorted.length / 2)];
        summary.min = sorted[0];
        summary.max = sorted[sorted.length - 1];
        summary.q1 = sorted[Math.floor(sorted.length * 0.25)];
        summary.q3 = sorted[Math.floor(sorted.length * 0.75)];
        
        // Standard deviation
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - summary.mean!, 2), 0) / numericValues.length;
        summary.stdDev = Math.sqrt(variance);
      }
    }

    // Mode calculation for all types
    const frequency = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<any, number>);
    
    const maxFreq = Math.max(...Object.values(frequency));
    summary.mode = Object.keys(frequency).find(key => frequency[key] === maxFreq);

    // Distribution for categorical data or small numeric ranges
    if (column.type === 'string' || uniqueValues.length <= 20) {
      summary.distribution = Object.entries(frequency)
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / values.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    return summary;
  };

  const calculateDataQuality = (data: any[], columns: DataColumn[]): DataQualityMetric[] => {
    const metrics: DataQualityMetric[] = [];

    // Completeness
    const totalCells = data.length * columns.length;
    const nullCells = data.reduce((acc, row) => {
      return acc + columns.filter(col => row[col.name] == null || row[col.name] === '').length;
    }, 0);
    const completeness = ((totalCells - nullCells) / totalCells) * 100;

    metrics.push({
      metric: 'Completeness',
      value: completeness,
      status: completeness >= 95 ? 'good' : completeness >= 80 ? 'warning' : 'error',
      description: `${completeness.toFixed(1)}% of data cells contain values`,
      recommendation: completeness < 95 ? 'Consider data cleaning to handle missing values' : undefined
    });

    // Uniqueness (for columns that should be unique)
    const uniqueColumns = columns.filter(col => col.unique);
    if (uniqueColumns.length > 0) {
      const uniquenessScores = uniqueColumns.map(col => {
        const values = data.map(row => row[col.name]).filter(v => v != null);
        const uniqueValues = new Set(values);
        return (uniqueValues.size / values.length) * 100;
      });
      const avgUniqueness = uniquenessScores.reduce((a, b) => a + b, 0) / uniquenessScores.length;

      metrics.push({
        metric: 'Uniqueness',
        value: avgUniqueness,
        status: avgUniqueness >= 95 ? 'good' : avgUniqueness >= 80 ? 'warning' : 'error',
        description: `${avgUniqueness.toFixed(1)}% uniqueness in key columns`,
        recommendation: avgUniqueness < 95 ? 'Check for duplicate records in unique columns' : undefined
      });
    }

    // Consistency (basic format validation)
    const numericColumns = columns.filter(col => col.type === 'number');
    if (numericColumns.length > 0) {
      const consistencyScores = numericColumns.map(col => {
        const values = data.map(row => row[col.name]).filter(v => v != null && v !== '');
        const validNumbers = values.filter(v => !isNaN(Number(v)));
        return values.length > 0 ? (validNumbers.length / values.length) * 100 : 100;
      });
      const avgConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;

      metrics.push({
        metric: 'Consistency',
        value: avgConsistency,
        status: avgConsistency >= 95 ? 'good' : avgConsistency >= 80 ? 'warning' : 'error',
        description: `${avgConsistency.toFixed(1)}% of numeric data is properly formatted`,
        recommendation: avgConsistency < 95 ? 'Standardize data formats and validate numeric fields' : undefined
      });
    }

    return metrics;
  };

  const calculateCorrelations = (data: any[], columns: DataColumn[]): Correlation[] => {
    const numericColumns = columns.filter(col => col.type === 'number');
    const correlations: Correlation[] = [];

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const pairs = data.map(row => [
          Number(row[col1.name]),
          Number(row[col2.name])
        ]).filter(([a, b]) => !isNaN(a) && !isNaN(b));

        if (pairs.length > 1) {
          const coefficient = calculatePearsonCorrelation(pairs);
          const absCoeff = Math.abs(coefficient);
          
          correlations.push({
            column1: col1.name,
            column2: col2.name,
            coefficient,
            strength: absCoeff >= 0.7 ? 'strong' : absCoeff >= 0.3 ? 'moderate' : 'weak',
            direction: coefficient >= 0 ? 'positive' : 'negative'
          });
        }
      }
    }

    return correlations.filter(corr => Math.abs(corr.coefficient) >= 0.3); // Only show meaningful correlations
  };

  const calculatePearsonCorrelation = (pairs: number[][]): number => {
    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Calculate statistical summaries
  const statisticalSummaries = useMemo(() => {
    return columns.map(column => calculateStatisticalSummary(data, column));
  }, [data, columns]);

  // Calculate data quality metrics
  const dataQualityMetrics = useMemo(() => {
    return calculateDataQuality(data, columns);
  }, [data, columns]);

  // Calculate correlations
  const correlations = useMemo(() => {
    return calculateCorrelations(data, columns);
  }, [data, columns]);

  const generateInsights = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newInsights: Insight[] = [];

    // Pattern insights
    statisticalSummaries.forEach(summary => {
      if (summary.type === 'number' && summary.stdDev && summary.mean) {
        const cv = summary.stdDev / summary.mean;
        if (cv > 1) {
          newInsights.push({
            id: `pattern-${summary.column}`,
            type: 'pattern',
            title: `High Variability in ${summary.column}`,
            description: `${summary.column} shows high variability (CV: ${cv.toFixed(2)}), indicating diverse data distribution.`,
            confidence: 0.8,
            impact: 'medium',
            recommendation: 'Consider segmentation analysis or outlier investigation.'
          });
        }
      }

      // Null value patterns
      if (summary.nullCount > summary.count * 0.1) {
        newInsights.push({
          id: `quality-${summary.column}`,
          type: 'quality',
          title: `Missing Data in ${summary.column}`,
          description: `${summary.column} has ${summary.nullCount} missing values (${((summary.nullCount / summary.count) * 100).toFixed(1)}%).`,
          confidence: 1.0,
          impact: 'high',
          recommendation: 'Investigate data collection process and consider imputation strategies.'
        });
      }
    });

    // Outlier detection
    statisticalSummaries.forEach(summary => {
      if (summary.type === 'number' && summary.q1 && summary.q3) {
        const iqr = summary.q3 - summary.q1;
        const lowerBound = summary.q1 - 1.5 * iqr;
        const upperBound = summary.q3 + 1.5 * iqr;
        
        const outliers = data.filter(row => {
          const value = Number(row[summary.column]);
          return !isNaN(value) && (value < lowerBound || value > upperBound);
        });

        if (outliers.length > 0) {
          newInsights.push({
            id: `outlier-${summary.column}`,
            type: 'outlier',
            title: `Outliers Detected in ${summary.column}`,
            description: `Found ${outliers.length} potential outliers in ${summary.column}.`,
            confidence: 0.7,
            impact: 'medium',
            recommendation: 'Review outliers for data entry errors or genuine extreme values.',
            data: { outliers: outliers.slice(0, 5) }
          });
        }
      }
    });

    // Correlation insights
    correlations.forEach(corr => {
      if (corr.strength === 'strong') {
        newInsights.push({
          id: `correlation-${corr.column1}-${corr.column2}`,
          type: 'correlation',
          title: `Strong ${corr.direction} correlation`,
          description: `${corr.column1} and ${corr.column2} show a strong ${corr.direction} correlation (r=${corr.coefficient.toFixed(3)}).`,
          confidence: 0.9,
          impact: 'high',
          recommendation: 'Consider this relationship in predictive modeling or business decisions.'
        });
      }
    });

    // Data quality insights
    dataQualityMetrics.forEach(metric => {
      if (metric.status === 'error') {
        newInsights.push({
          id: `quality-${metric.metric}`,
          type: 'quality',
          title: `Data Quality Issue: ${metric.metric}`,
          description: metric.description,
          confidence: 1.0,
          impact: 'high',
          recommendation: metric.recommendation
        });
      }
    });

    setInsights(newInsights);
    setIsAnalyzing(false);
    onInsightGenerated?.(newInsights);
  }, [data, columns, statisticalSummaries, dataQualityMetrics, correlations, onInsightGenerated]);

  // Generate insights automatically when data changes
  useEffect(() => {
    if (data.length > 0) {
      generateInsights();
    }
  }, [data, columns, generateInsights]);

  const filteredInsights = selectedInsightType === 'all'
    ? insights 
    : insights.filter(insight => insight.type === selectedInsightType);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'trend': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'outlier': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'quality': return <Target className="w-5 h-5 text-red-600" />;
      case 'correlation': return <Brain className="w-5 h-5 text-purple-600" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Data Insights & Analytics</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {showDetailedStats ? 'Hide' : 'Show'} Detailed Stats
            </button>
            <button
              onClick={generateInsights}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Regenerate Insights'}</span>
            </button>
          </div>
        </div>

        {/* Data Quality Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {dataQualityMetrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">{metric.metric}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  metric.status === 'good' ? 'bg-green-100 text-green-700' :
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {metric.value.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-600">{metric.description}</p>
              {metric.recommendation && (
                <p className="text-xs text-gray-500 mt-2">{metric.recommendation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Insight Filters */}
        <div className="flex space-x-2 mb-4">
          {['all', 'pattern', 'outlier', 'correlation', 'quality', 'trend'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedInsightType(type)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                selectedInsightType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
              {type !== 'all' && (
                <span className="ml-1 text-xs">
                  ({insights.filter(i => i.type === type).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Insights */}
      <div className="space-y-4">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => (
            <div key={insight.id} className="bg-white border rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(insight.impact)}`}>
                        {insight.impact} impact
                      </span>
                      <span className="text-xs text-gray-500">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-3">{insight.description}</p>
              
              {insight.recommendation && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white border rounded-lg p-8 text-center">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isAnalyzing ? 'Analyzing your data...' : 'No insights generated yet'}
            </h3>
            <p className="text-gray-600">
              {isAnalyzing 
                ? 'Please wait while we analyze your data for patterns and insights.'
                : 'Click "Regenerate Insights" to analyze your data for patterns, outliers, and recommendations.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Detailed Statistics */}
      {showDetailedStats && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Statistical Summary</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Null</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mean</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Std Dev</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statisticalSummaries.map((summary, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {summary.column}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs ${
                        summary.type === 'number' ? 'bg-blue-100 text-blue-700' :
                        summary.type === 'date' ? 'bg-green-100 text-green-700' :
                        summary.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {summary.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.nullCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.uniqueCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.mean ? summary.mean.toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.stdDev ? summary.stdDev.toFixed(2) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.min != null ? summary.min : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {summary.max != null ? summary.max : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlations */}
      {correlations.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Correlation Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {correlations.map((corr, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">
                    {corr.column1} × {corr.column2}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    corr.strength === 'strong' ? 'bg-red-100 text-red-700' :
                    corr.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {corr.strength}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {corr.direction} correlation: {corr.coefficient.toFixed(3)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      corr.direction === 'positive' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.abs(corr.coefficient) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsGeneration;

'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, LineChart, PieChart, ScatterChart, TrendingUp, Grid, Download, Settings, Plus, X } from 'lucide-react';

interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  unique: boolean;
  samples: any[];
}

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'heatmap' | 'area' | 'donut';
  title: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  data: any[];
  config?: any;
}

interface VisualizationDashboardProps {
  data: any[];
  columns: DataColumn[];
  onExportDashboard?: (format: 'pdf' | 'png' | 'html') => void;
}

const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  data,
  columns,
  onExportDashboard
}) => {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [showAddChart, setShowAddChart] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartConfig['type']>('bar');
  const [dashboardLayout, setDashboardLayout] = useState<'grid' | 'list'>('grid');

  // Get numeric and categorical columns
  const numericColumns = columns.filter(col => col.type === 'number');
  const categoricalColumns = columns.filter(col => col.type === 'string' || col.type === 'boolean');
  const dateColumns = columns.filter(col => col.type === 'date');

  // Auto-generate suggested charts
  const suggestedCharts = useMemo(() => {
    const suggestions: Partial<ChartConfig>[] = [];

    // Bar chart for categorical data
    if (categoricalColumns.length > 0) {
      suggestions.push({
        type: 'bar',
        title: `Distribution of ${categoricalColumns[0].name}`,
        xAxis: categoricalColumns[0].name,
        aggregation: 'count'
      });
    }

    // Line chart for time series
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'line',
        title: `${numericColumns[0].name} over time`,
        xAxis: dateColumns[0].name,
        yAxis: numericColumns[0].name,
        aggregation: 'sum'
      });
    }

    // Scatter plot for numeric correlations
    if (numericColumns.length >= 2) {
      suggestions.push({
        type: 'scatter',
        title: `${numericColumns[0].name} vs ${numericColumns[1].name}`,
        xAxis: numericColumns[0].name,
        yAxis: numericColumns[1].name
      });
    }

    // Pie chart for categorical distribution
    if (categoricalColumns.length > 0) {
      suggestions.push({
        type: 'pie',
        title: `${categoricalColumns[0].name} Distribution`,
        groupBy: categoricalColumns[0].name,
        aggregation: 'count'
      });
    }

    // Histogram for numeric distribution
    if (numericColumns.length > 0) {
      suggestions.push({
        type: 'histogram',
        title: `${numericColumns[0].name} Distribution`,
        xAxis: numericColumns[0].name
      });
    }

    return suggestions;
  }, [columns, categoricalColumns, numericColumns, dateColumns]);

  const processChartData = (config: Partial<ChartConfig>): any[] => {
    if (!config.type) return [];

    switch (config.type) {
      case 'bar':
      case 'pie':
      case 'donut':
        return processGroupedData(config);
      case 'line':
      case 'area':
        return processTimeSeriesData(config);
      case 'scatter':
        return processScatterData(config);
      case 'histogram':
        return processHistogramData(config);
      case 'heatmap':
        return processHeatmapData(config);
      default:
        return [];
    }
  };

  const processGroupedData = (config: Partial<ChartConfig>): any[] => {
    if (!config.groupBy) return [];

    const grouped = data.reduce((acc, row) => {
      const key = row[config.groupBy!];
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([key, values]) => {
      let value = values.length; // default count

      if (config.yAxis && config.aggregation && config.aggregation !== 'count') {
        const numericValues = values.map(v => Number(v[config.yAxis!])).filter(n => !isNaN(n));
        
        switch (config.aggregation) {
          case 'sum':
            value = numericValues.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            value = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
            break;
          case 'min':
            value = Math.min(...numericValues);
            break;
          case 'max':
            value = Math.max(...numericValues);
            break;
        }
      }

      return { label: key, value, count: values.length };
    }).sort((a, b) => b.value - a.value);
  };

  const processTimeSeriesData = (config: Partial<ChartConfig>): any[] => {
    if (!config.xAxis || !config.yAxis) return [];

    return data.map(row => ({
      x: row[config.xAxis!],
      y: Number(row[config.yAxis!]) || 0,
      date: row[config.xAxis!]
    })).filter(item => item.x && !isNaN(item.y))
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  };

  const processScatterData = (config: Partial<ChartConfig>): any[] => {
    if (!config.xAxis || !config.yAxis) return [];

    return data.map(row => ({
      x: Number(row[config.xAxis!]) || 0,
      y: Number(row[config.yAxis!]) || 0
    })).filter(item => !isNaN(item.x) && !isNaN(item.y));
  };

  const processHistogramData = (config: Partial<ChartConfig>): any[] => {
    if (!config.xAxis) return [];

    const values = data.map(row => Number(row[config.xAxis!])).filter(n => !isNaN(n));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const binSize = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
      min: min + i * binSize,
      max: min + (i + 1) * binSize
    }));

    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      bins[binIndex].count++;
    });

    return bins;
  };

  const processHeatmapData = (config: Partial<ChartConfig>): any[] => {
    // Simple correlation heatmap for numeric columns
    const numCols = numericColumns.slice(0, 5); // Limit for performance
    const correlations: any[] = [];

    for (let i = 0; i < numCols.length; i++) {
      for (let j = 0; j < numCols.length; j++) {
        const col1 = numCols[i];
        const col2 = numCols[j];
        
        if (i === j) {
          correlations.push({ x: col1.name, y: col2.name, value: 1 });
        } else {
          const pairs = data.map(row => [Number(row[col1.name]), Number(row[col2.name])])
            .filter(([a, b]) => !isNaN(a) && !isNaN(b));
          
          const correlation = calculateCorrelation(pairs);
          correlations.push({ x: col1.name, y: col2.name, value: correlation });
        }
      }
    }

    return correlations;
  };

  const calculateCorrelation = (pairs: number[][]): number => {
    if (pairs.length < 2) return 0;
    
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

  const addChart = (config: Partial<ChartConfig>) => {
    const chartData = processChartData(config);
    
    const newChart: ChartConfig = {
      id: `chart-${Date.now()}`,
      type: config.type!,
      title: config.title || `${config.type} Chart`,
      xAxis: config.xAxis,
      yAxis: config.yAxis,
      groupBy: config.groupBy,
      aggregation: config.aggregation,
      data: chartData,
      config: config.config
    };

    setCharts(prev => [...prev, newChart]);
    setShowAddChart(false);
  };

  const removeChart = (chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
  };

  const getChartIcon = (type: ChartConfig['type']) => {
    switch (type) {
      case 'bar': return <BarChart3 className="w-5 h-5" />;
      case 'line': return <LineChart className="w-5 h-5" />;
      case 'area': return <TrendingUp className="w-5 h-5" />;
      case 'pie': 
      case 'donut': return <PieChart className="w-5 h-5" />;
      case 'scatter': return <ScatterChart className="w-5 h-5" />;
      case 'histogram': return <BarChart3 className="w-5 h-5" />;
      case 'heatmap': return <Grid className="w-5 h-5" />;
      default: return <BarChart3 className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Visualization Dashboard</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setDashboardLayout(dashboardLayout === 'grid' ? 'list' : 'grid')}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Grid className="w-4 h-4" />
              <span>{dashboardLayout === 'grid' ? 'List' : 'Grid'} View</span>
            </button>
            <button
              onClick={() => setShowAddChart(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chart</span>
            </button>
            <button
              onClick={() => onExportDashboard?.('pdf')}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Quick Add Suggested Charts */}
        {charts.length === 0 && suggestedCharts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Suggested Charts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedCharts.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => addChart(suggestion)}
                  className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  {getChartIcon(suggestion.type!)}
                  <div>
                    <div className="font-medium text-gray-900">{suggestion.title}</div>
                    <div className="text-sm text-gray-600 capitalize">{suggestion.type} chart</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Chart Modal */}
      {showAddChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Chart</h3>
              <button
                onClick={() => setShowAddChart(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <ChartConfigForm
              chartType={selectedChartType}
              columns={columns}
              onChartTypeChange={setSelectedChartType}
              onAddChart={addChart}
              onCancel={() => setShowAddChart(false)}
            />
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {charts.length > 0 ? (
        <div className={`grid gap-6 ${
          dashboardLayout === 'grid' 
            ? 'grid-cols-1 lg:grid-cols-2' 
            : 'grid-cols-1'
        }`}>
          {charts.map((chart) => (
            <div key={chart.id} className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  {getChartIcon(chart.type)}
                  <h4 className="font-medium text-gray-900">{chart.title}</h4>
                </div>
                <button
                  onClick={() => removeChart(chart.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-64">
                <ChartRenderer chart={chart} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No charts created yet</h3>
          <p className="text-gray-600 mb-4">
            Create visualizations to explore your data and discover insights
          </p>
          <button
            onClick={() => setShowAddChart(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Create Your First Chart
          </button>
        </div>
      )}
    </div>
  );
};

// Chart Configuration Form Component
interface ChartConfigFormProps {
  chartType: ChartConfig['type'];
  columns: DataColumn[];
  onChartTypeChange: (type: ChartConfig['type']) => void;
  onAddChart: (config: Partial<ChartConfig>) => void;
  onCancel: () => void;
}

const ChartConfigForm: React.FC<ChartConfigFormProps> = ({
  chartType,
  columns,
  onChartTypeChange,
  onAddChart,
  onCancel
}) => {
  const [title, setTitle] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [aggregation, setAggregation] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count');

  const numericColumns = columns.filter(col => col.type === 'number');
  const categoricalColumns = columns.filter(col => col.type === 'string' || col.type === 'boolean');
  const allColumns = columns;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const config: Partial<ChartConfig> = {
      type: chartType,
      title: title || `${chartType} Chart`,
      aggregation
    };

    if (['bar', 'line', 'area', 'scatter', 'histogram'].includes(chartType)) {
      config.xAxis = xAxis;
      if (chartType !== 'histogram') config.yAxis = yAxis;
    }

    if (['pie', 'donut', 'bar'].includes(chartType)) {
      config.groupBy = groupBy || xAxis;
    }

    onAddChart(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Chart Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
        <div className="grid grid-cols-4 gap-2">
          {(['bar', 'line', 'pie', 'scatter', 'histogram', 'area', 'donut', 'heatmap'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => onChartTypeChange(type)}
              className={`p-3 border rounded-lg text-center ${
                chartType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                {/* Chart type icon would go here */}
                <span className="text-xs font-medium capitalize">{type}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Enter chart title"
        />
      </div>

      {/* Chart-specific configuration */}
      {['bar', 'line', 'area', 'scatter'].includes(chartType) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis</label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select column</option>
              {allColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis</label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">Select column</option>
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {['pie', 'donut'].includes(chartType) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Select column</option>
            {categoricalColumns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>
      )}

      {chartType === 'histogram' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Select column</option>
            {numericColumns.map(col => (
              <option key={col.name} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Aggregation */}
      {!['scatter', 'histogram', 'heatmap'].includes(chartType) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as any)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Chart
        </button>
      </div>
    </form>
  );
};

// Chart Renderer Component (simplified - would use actual charting library)
interface ChartRendererProps {
  chart: ChartConfig;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
  // This is a simplified representation
  // In production, you would use a charting library like Chart.js, D3, or Recharts
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
      <div className="text-center">
        {getChartIcon(chart.type)}
        <div className="mt-2 text-sm text-gray-600">
          {chart.type.toUpperCase()} Chart
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {chart.data.length} data points
        </div>
        {chart.xAxis && (
          <div className="text-xs text-gray-500">
            X: {chart.xAxis} {chart.yAxis && `| Y: ${chart.yAxis}`}
          </div>
        )}
      </div>
    </div>
  );
};

const getChartIcon = (type: ChartConfig['type']) => {
  switch (type) {
    case 'bar': return <BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'line': return <LineChart className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'area': return <TrendingUp className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'pie': 
    case 'donut': return <PieChart className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'scatter': return <ScatterChart className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'histogram': return <BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />;
    case 'heatmap': return <Grid className="w-8 h-8 text-gray-400 mx-auto" />;
    default: return <BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />;
  }
};

export default VisualizationDashboard;

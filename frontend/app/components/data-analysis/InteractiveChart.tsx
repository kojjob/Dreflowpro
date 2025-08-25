'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Filler,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, Scatter, Radar, PolarArea } from 'react-chartjs-2';
import { Download, Maximize2, RefreshCw, Settings, TrendingUp, BarChart3, PieChart } from 'lucide-react';

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
  RadialLinearScale,
  Filler
);

interface InteractiveChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'polarArea';
  data: any;
  title: string;
  description?: string;
  height?: number;
  showControls?: boolean;
  onExport?: (format: 'png' | 'pdf') => void;
  className?: string;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  type,
  data,
  title,
  description,
  height = 300,
  showControls = true,
  onExport,
  className = ''
}) => {
  const [isAnimated, setIsAnimated] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<any>(null);

  // DreflowPro enhanced chart options
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: isAnimated ? 1000 : 0,
        easing: 'easeInOutQuart' as const,
      },
      plugins: {
        legend: {
          display: showLegend,
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              family: 'Inter, system-ui, sans-serif',
            },
            color: '#374151',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold' as const,
          },
          bodyFont: {
            size: 13,
          },
          displayColors: true,
          callbacks: {
            title: (context: any) => {
              return context[0]?.label || '';
            },
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
              return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      hover: {
        animationDuration: 200,
      },
    };

    // Chart-specific options
    if (type === 'bar' || type === 'line') {
      return {
        ...baseOptions,
        scales: {
          x: {
            grid: {
              display: type === 'line',
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 11,
              },
              callback: function(value: any) {
                return typeof value === 'number' ? value.toLocaleString() : value;
              },
            },
          },
        },
      };
    }

    return baseOptions;
  };

  const handleExport = (format: 'png' | 'pdf') => {
    if (chartRef.current && onExport) {
      onExport(format);
    }
  };

  const getChartIcon = () => {
    switch (type) {
      case 'bar':
        return <BarChart3 className="w-4 h-4" />;
      case 'line':
        return <TrendingUp className="w-4 h-4" />;
      case 'pie':
      case 'doughnut':
        return <PieChart className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const renderChart = () => {
    const chartProps = {
      ref: chartRef,
      data,
      options: getChartOptions(),
    };

    switch (type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'line':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'doughnut':
        return <Doughnut {...chartProps} />;
      case 'scatter':
        return <Scatter {...chartProps} />;
      case 'radar':
        return <Radar {...chartProps} />;
      case 'polarArea':
        return <PolarArea {...chartProps} />;
      default:
        return <Bar {...chartProps} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden ${className}`}
    >
      {/* Chart Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-brand-100 to-blue-100 rounded-lg">
              {getChartIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>

          {showControls && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle legend"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setIsAnimated(!isAnimated)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle animation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {onExport && (
                <button
                  onClick={() => handleExport('png')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Export chart"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        <div style={{ height: isFullscreen ? '70vh' : `${height}px` }}>
          {renderChart()}
        </div>
      </div>

      {/* Chart Footer with Stats */}
      {data?.datasets && (
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {data.datasets.length} dataset{data.datasets.length !== 1 ? 's' : ''} • 
              {data.labels?.length || 0} data point{data.labels?.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default InteractiveChart;

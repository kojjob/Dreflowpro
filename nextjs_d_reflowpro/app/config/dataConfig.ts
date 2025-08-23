/**
 * Data Upload & Analysis Configuration
 * Centralized configuration for file upload, analysis, and visualization settings
 */

// Environment-based configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
} as const;

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || String(50 * 1024 * 1024)), // 50MB default
  defaultPreviewRows: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PREVIEW_ROWS || '100'),
  acceptedFileTypes: (process.env.NEXT_PUBLIC_ACCEPTED_FILE_TYPES || '.csv,.xlsx,.xls,.json,.txt,.tsv').split(','),
  acceptedMimeTypes: {
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/json': ['.json'],
    'text/plain': ['.txt', '.tsv'],
  },
} as const;

// Data preview configuration
export const PREVIEW_CONFIG = {
  defaultRows: parseInt(process.env.NEXT_PUBLIC_PREVIEW_DEFAULT_ROWS || '50'),
  maxRows: parseInt(process.env.NEXT_PUBLIC_PREVIEW_MAX_ROWS || '1000'),
  tableDisplayRows: parseInt(process.env.NEXT_PUBLIC_TABLE_DISPLAY_ROWS || '20'),
  pageSize: parseInt(process.env.NEXT_PUBLIC_PREVIEW_PAGE_SIZE || '25'),
  availablePageSizes: [10, 20, 25, 50, 100],
} as const;

// Visualization configuration
export const VISUALIZATION_CONFIG = {
  defaultChartTypes: ['bar', 'pie', 'line', 'histogram'],
  maxDataPoints: parseInt(process.env.NEXT_PUBLIC_MAX_CHART_DATA_POINTS || '1000'),
  colorPalette: [
    'rgba(59, 130, 246, 0.8)',   // blue
    'rgba(16, 185, 129, 0.8)',   // green
    'rgba(245, 158, 11, 0.8)',   // yellow
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(139, 92, 246, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
  ],
} as const;

// Chart type configurations
export const CHART_TYPES = {
  bar: {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Great for comparing values across categories',
    icon: '📊',
    dataRequirements: {
      minDataPoints: 1,
      maxDataPoints: 50,
      dataTypes: ['categorical', 'numerical'],
      supportsMultiSeries: true,
    },
    compatibility: {
      temporal: 'good',
      categorical: 'excellent',
      numerical: 'excellent',
      proportional: 'fair',
    },
  },
  line: {
    id: 'line',
    name: 'Line Chart',
    description: 'Perfect for showing trends and changes over time',
    icon: '📈',
    dataRequirements: {
      minDataPoints: 2,
      maxDataPoints: 200,
      dataTypes: ['temporal', 'numerical'],
      supportsMultiSeries: true,
    },
    compatibility: {
      temporal: 'excellent',
      categorical: 'fair',
      numerical: 'excellent',
      proportional: 'poor',
    },
  },
  pie: {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Ideal for showing proportions and percentages',
    icon: '🥧',
    dataRequirements: {
      minDataPoints: 2,
      maxDataPoints: 10,
      dataTypes: ['categorical', 'proportional'],
      supportsMultiSeries: false,
    },
    compatibility: {
      temporal: 'poor',
      categorical: 'excellent',
      numerical: 'fair',
      proportional: 'excellent',
    },
  },
  doughnut: {
    id: 'doughnut',
    name: 'Doughnut Chart',
    description: 'Similar to pie chart with a hollow center',
    icon: '🍩',
    dataRequirements: {
      minDataPoints: 2,
      maxDataPoints: 10,
      dataTypes: ['categorical', 'proportional'],
      supportsMultiSeries: false,
    },
    compatibility: {
      temporal: 'poor',
      categorical: 'excellent',
      numerical: 'fair',
      proportional: 'excellent',
    },
  },
  scatter: {
    id: 'scatter',
    name: 'Scatter Plot',
    description: 'Excellent for showing relationships between variables',
    icon: '⚫',
    dataRequirements: {
      minDataPoints: 3,
      maxDataPoints: 500,
      dataTypes: ['numerical'],
      supportsMultiSeries: true,
      requiresXYData: true,
    },
    compatibility: {
      temporal: 'good',
      categorical: 'poor',
      numerical: 'excellent',
      proportional: 'poor',
    },
  },
  radar: {
    id: 'radar',
    name: 'Radar Chart',
    description: 'Great for comparing multiple variables',
    icon: '🕸️',
    dataRequirements: {
      minDataPoints: 3,
      maxDataPoints: 10,
      dataTypes: ['numerical'],
      supportsMultiSeries: true,
    },
    compatibility: {
      temporal: 'poor',
      categorical: 'good',
      numerical: 'excellent',
      proportional: 'fair',
    },
  },
} as const;

// Chart type compatibility rules
export const CHART_COMPATIBILITY = {
  getCompatibleChartTypes: (dataType: string, dataPointsCount: number): string[] => {
    return Object.values(CHART_TYPES)
      .filter(chart => {
        const isCompatible = chart.compatibility[dataType as keyof typeof chart.compatibility];
        const meetsDataRequirements = dataPointsCount >= chart.dataRequirements.minDataPoints && 
                                     dataPointsCount <= chart.dataRequirements.maxDataPoints;
        return (isCompatible === 'excellent' || isCompatible === 'good') && meetsDataRequirements;
      })
      .map(chart => chart.id);
  },
  
  getRecommendedChartType: (dataType: string, dataPointsCount: number): string => {
    const compatibleTypes = CHART_COMPATIBILITY.getCompatibleChartTypes(dataType, dataPointsCount);
    
    // Return the most compatible chart type
    for (const chartType of Object.values(CHART_TYPES)) {
      if (compatibleTypes.includes(chartType.id) && 
          chartType.compatibility[dataType as keyof typeof chartType.compatibility] === 'excellent') {
        return chartType.id;
      }
    }
    
    return compatibleTypes[0] || 'bar'; // fallback to bar chart
  },
  
  validateChartTypeForData: (chartType: string, data: any): boolean => {
    const chart = CHART_TYPES[chartType as keyof typeof CHART_TYPES];
    if (!chart) return false;
    
    const dataPointsCount = data?.labels?.length || 0;
    return dataPointsCount >= chart.dataRequirements.minDataPoints && 
           dataPointsCount <= chart.dataRequirements.maxDataPoints;
  },
} as const;

// Transformation configuration
export const TRANSFORMATION_CONFIG = {
  defaultTransformations: [
    {
      type: 'deduplicate',
      name: 'Remove Duplicates',
      description: 'Remove duplicate rows from your data',
      icon: 'Zap',
      enabled: true,
    },
    {
      type: 'validate',
      name: 'Data Validation',
      description: 'Validate and clean your data',
      icon: 'Eye',
      enabled: true,
    },
    {
      type: 'aggregate',
      name: 'Aggregate Data',
      description: 'Group and summarize your data',
      icon: 'Download',
      enabled: true,
    },
  ],
} as const;

// Quality assessment configuration
export const QUALITY_CONFIG = {
  scoreThresholds: {
    good: parseInt(process.env.NEXT_PUBLIC_QUALITY_GOOD_THRESHOLD || '80'),
    fair: parseInt(process.env.NEXT_PUBLIC_QUALITY_FAIR_THRESHOLD || '60'),
  },
  assessmentMetrics: ['completeness', 'uniqueness', 'validity', 'consistency'],
} as const;

// User preferences defaults
export const USER_PREFERENCES_DEFAULTS = {
  uploadPreferences: {
    autoAnalyze: true,
    defaultPreviewRows: UPLOAD_CONFIG.defaultPreviewRows,
    rememberLastSettings: true,
  },
  visualizationPreferences: {
    defaultChartType: 'bar',
    showDataQuality: true,
    enableInteractiveCharts: true,
    chartTypePreferences: {} as Record<string, string>, // fileId -> chartType mapping
    rememberChartChoices: true,
  },
  previewPreferences: {
    defaultPageSize: PREVIEW_CONFIG.pageSize,
    showColumnTypes: true,
    highlightMissingValues: true,
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  data: {
    upload: '/api/v1/data/upload',
    preview: (fileId: string) => `/api/v1/data/files/${fileId}/preview`,
    analyze: (fileId: string) => `/api/v1/data/files/${fileId}/analyze`,
    transform: (fileId: string) => `/api/v1/data/files/${fileId}/transform`,
    delete: (fileId: string) => `/api/v1/data/files/${fileId}`,
    info: (fileId: string) => `/api/v1/data/files/${fileId}`,
    supportedFormats: '/api/v1/data/supported-formats',
  },
  config: {
    upload: '/api/v1/config/upload',
    transformations: '/api/v1/config/transformations',
    userPreferences: '/api/v1/config/user-preferences',
  },
} as const;

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidFileType = (fileName: string): boolean => {
  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  return UPLOAD_CONFIG.acceptedFileTypes.includes(extension);
};

export const getQualityColor = (score: number): string => {
  if (score >= QUALITY_CONFIG.scoreThresholds.good) return 'text-green-600';
  if (score >= QUALITY_CONFIG.scoreThresholds.fair) return 'text-yellow-600';
  return 'text-red-600';
};

export const getQualityLabel = (score: number): string => {
  if (score >= QUALITY_CONFIG.scoreThresholds.good) return 'Good';
  if (score >= QUALITY_CONFIG.scoreThresholds.fair) return 'Fair';
  return 'Poor';
};

// Type definitions for configuration
export interface UploadSettings {
  maxFileSize: number;
  acceptedTypes: string[];
  defaultPreviewRows: number;
  autoAnalyze: boolean;
}

export interface TransformationOption {
  type: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface UserPreferences {
  uploadPreferences: {
    autoAnalyze: boolean;
    defaultPreviewRows: number;
    rememberLastSettings: boolean;
  };
  visualizationPreferences: {
    defaultChartType: string;
    showDataQuality: boolean;
    enableInteractiveCharts: boolean;
    chartTypePreferences: Record<string, string>; // fileId -> chartType mapping
    rememberChartChoices: boolean;
  };
  previewPreferences: {
    defaultPageSize: number;
    showColumnTypes: boolean;
    highlightMissingValues: boolean;
  };
}

export default {
  API_CONFIG,
  UPLOAD_CONFIG,
  PREVIEW_CONFIG,
  VISUALIZATION_CONFIG,
  CHART_TYPES,
  CHART_COMPATIBILITY,
  TRANSFORMATION_CONFIG,
  QUALITY_CONFIG,
  USER_PREFERENCES_DEFAULTS,
  API_ENDPOINTS,
  formatFileSize,
  isValidFileType,
  getQualityColor,
  getQualityLabel,
};
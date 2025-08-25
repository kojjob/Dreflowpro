'use client';

import React from 'react';
import {
  // Data & Analytics Icons
  Database, BarChart3, TrendingUp, TrendingDown, PieChart, Activity,
  Target, Zap, Eye, Filter, Search, RefreshCw, Download, Upload,
  
  // Status & Quality Icons
  CheckCircle, AlertTriangle, AlertCircle, Info, XCircle, Clock,
  Shield, Award, Star, Bookmark, Flag, Bell,
  
  // Business & Metrics Icons
  DollarSign, Users, Calendar, Globe, Building, Briefcase,
  CreditCard, ShoppingCart, Package, Truck, MapPin, Phone,
  
  // Technical Icons
  Settings, Code, Server, Cloud, Lock, Key, Wifi, Monitor,
  Smartphone, Tablet, Laptop, HardDrive, Cpu, MemoryStick,
  
  // Navigation & Actions Icons
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus, Minus,
  X, Check, Edit, Trash2, Copy, Share2, ExternalLink, Home,
  
  // Content Icons
  FileText, File, Folder, Image, Video, Music, Mail, MessageSquare,
  
  // UI Enhancement Icons
  Maximize2, Minimize2, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  Grid, List, Layout, Layers, Palette, Brush
} from 'lucide-react';

// Icon categories for data analysis
export const DataAnalysisIcons = {
  // Data Types
  dataTypes: {
    numerical: BarChart3,
    categorical: PieChart,
    temporal: TrendingUp,
    text: FileText,
    boolean: CheckCircle,
    mixed: Database
  },
  
  // Chart Types
  chartTypes: {
    bar: BarChart3,
    line: TrendingUp,
    pie: PieChart,
    doughnut: Target,
    scatter: Activity,
    radar: Shield,
    area: TrendingUp,
    histogram: BarChart3
  },
  
  // Metrics & KPIs
  metrics: {
    revenue: DollarSign,
    users: Users,
    growth: TrendingUp,
    decline: TrendingDown,
    conversion: Target,
    engagement: Activity,
    retention: Shield,
    acquisition: Plus,
    churn: Minus,
    satisfaction: Star
  },
  
  // Data Quality
  quality: {
    excellent: CheckCircle,
    good: Shield,
    fair: AlertTriangle,
    poor: AlertCircle,
    missing: XCircle,
    complete: CheckCircle,
    accurate: Target,
    consistent: RefreshCw
  },
  
  // Insights & Analysis
  insights: {
    trend: TrendingUp,
    pattern: Eye,
    anomaly: AlertTriangle,
    correlation: Activity,
    prediction: TrendingUp,
    recommendation: Zap,
    discovery: Search,
    summary: FileText
  },
  
  // Business Categories
  business: {
    sales: ShoppingCart,
    marketing: Globe,
    finance: DollarSign,
    operations: Settings,
    hr: Users,
    customer: Users,
    product: Package,
    support: Phone
  }
};

// Icon wrapper component with consistent styling
interface IconWrapperProps {
  icon: React.ComponentType<any>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
  variant?: 'solid' | 'outline' | 'ghost' | 'gradient';
  className?: string;
  onClick?: () => void;
}

export const IconWrapper: React.FC<IconWrapperProps> = ({
  icon: IconComponent,
  size = 'md',
  color = 'primary',
  variant = 'solid',
  className = '',
  onClick
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const colorClasses = {
    primary: {
      solid: 'text-brand-600 bg-brand-100',
      outline: 'text-brand-600 border border-brand-300',
      ghost: 'text-brand-600 hover:bg-brand-50',
      gradient: 'text-white bg-gradient-to-r from-brand-500 to-blue-500'
    },
    secondary: {
      solid: 'text-blue-600 bg-blue-100',
      outline: 'text-blue-600 border border-blue-300',
      ghost: 'text-blue-600 hover:bg-blue-50',
      gradient: 'text-white bg-gradient-to-r from-blue-500 to-indigo-500'
    },
    success: {
      solid: 'text-green-600 bg-green-100',
      outline: 'text-green-600 border border-green-300',
      ghost: 'text-green-600 hover:bg-green-50',
      gradient: 'text-white bg-gradient-to-r from-green-500 to-emerald-500'
    },
    warning: {
      solid: 'text-yellow-600 bg-yellow-100',
      outline: 'text-yellow-600 border border-yellow-300',
      ghost: 'text-yellow-600 hover:bg-yellow-50',
      gradient: 'text-white bg-gradient-to-r from-yellow-500 to-orange-500'
    },
    danger: {
      solid: 'text-red-600 bg-red-100',
      outline: 'text-red-600 border border-red-300',
      ghost: 'text-red-600 hover:bg-red-50',
      gradient: 'text-white bg-gradient-to-r from-red-500 to-pink-500'
    },
    info: {
      solid: 'text-purple-600 bg-purple-100',
      outline: 'text-purple-600 border border-purple-300',
      ghost: 'text-purple-600 hover:bg-purple-50',
      gradient: 'text-white bg-gradient-to-r from-purple-500 to-indigo-500'
    },
    gray: {
      solid: 'text-gray-600 bg-gray-100',
      outline: 'text-gray-600 border border-gray-300',
      ghost: 'text-gray-600 hover:bg-gray-50',
      gradient: 'text-white bg-gradient-to-r from-gray-500 to-slate-500'
    }
  };

  const baseClasses = 'inline-flex items-center justify-center rounded-lg transition-all duration-200';
  const paddingClasses = size === 'xs' ? 'p-1' : size === 'sm' ? 'p-1.5' : size === 'md' ? 'p-2' : size === 'lg' ? 'p-2.5' : 'p-3';
  const hoverClasses = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-md' : '';

  return (
    <div
      className={`${baseClasses} ${paddingClasses} ${colorClasses[color][variant]} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      <IconComponent className={sizeClasses[size]} />
    </div>
  );
};

// Metric card component with icon
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  description?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  color = 'primary',
  description,
  className = ''
}) => {
  const getChangeIcon = () => {
    if (changeType === 'increase') return ArrowUp;
    if (changeType === 'decrease') return ArrowDown;
    return Minus;
  };

  const getChangeColor = () => {
    if (changeType === 'increase') return 'text-green-600';
    if (changeType === 'decrease') return 'text-red-600';
    return 'text-gray-600';
  };

  const ChangeIcon = getChangeIcon();

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 hover:shadow-2xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <IconWrapper
          icon={icon}
          size="lg"
          color={color}
          variant="gradient"
        />
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm ${getChangeColor()}`}>
            <ChangeIcon className="w-3 h-3" />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm font-medium text-gray-700 mb-2">{title}</div>
        {description && (
          <div className="text-xs text-gray-500">{description}</div>
        )}
      </div>
    </div>
  );
};

// Status badge component with icon
interface StatusBadgeProps {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  const statusConfig = {
    excellent: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-200',
      label: 'Excellent'
    },
    good: {
      icon: Shield,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Good'
    },
    fair: {
      icon: AlertTriangle,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Fair'
    },
    poor: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-800 border-red-200',
      label: 'Poor'
    },
    unknown: {
      icon: Info,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Unknown'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]} ${className}`}>
      {showIcon && <StatusIcon className={iconSizes[size]} />}
      <span>{label || config.label}</span>
    </span>
  );
};

// Helper function to get icon by category and type
export const getIcon = (category: keyof typeof DataAnalysisIcons, type: string) => {
  const categoryIcons = DataAnalysisIcons[category];
  if (categoryIcons && categoryIcons[type as keyof typeof categoryIcons]) {
    return categoryIcons[type as keyof typeof categoryIcons];
  }
  return Database; // Default fallback icon
};

// Helper function to get appropriate color for data type
export const getDataTypeColor = (dataType: string): 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (dataType.toLowerCase()) {
    case 'numerical':
    case 'number':
      return 'primary';
    case 'categorical':
    case 'string':
      return 'secondary';
    case 'temporal':
    case 'date':
      return 'success';
    case 'boolean':
      return 'warning';
    case 'mixed':
      return 'info';
    default:
      return 'primary';
  }
};

export default {
  DataAnalysisIcons,
  IconWrapper,
  MetricCard,
  StatusBadge,
  getIcon,
  getDataTypeColor
};

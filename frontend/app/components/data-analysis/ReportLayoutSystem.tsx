'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText, BarChart3, TrendingUp, PieChart, Activity,
  Target, CheckCircle, AlertTriangle, Info, Zap,
  Database, Users, Calendar, Award, Star
} from 'lucide-react';

interface ReportSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  size: 'full' | 'half' | 'third' | 'quarter';
  background?: string;
}

interface ReportLayoutSystemProps {
  sections: ReportSection[];
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

const ReportLayoutSystem: React.FC<ReportLayoutSystemProps> = ({
  sections,
  title,
  subtitle,
  headerActions,
  className = ''
}) => {
  // Sort sections by priority
  const sortedSections = [...sections].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const getSectionGridClass = (size: string) => {
    switch (size) {
      case 'full':
        return 'col-span-1 md:col-span-2 lg:col-span-3';
      case 'half':
        return 'col-span-1 md:col-span-1 lg:col-span-1';
      case 'third':
        return 'col-span-1';
      case 'quarter':
        return 'col-span-1';
      default:
        return 'col-span-1';
    }
  };

  const getSectionBackground = (background?: string) => {
    if (background) return background;
    return 'bg-white/80 backdrop-blur-sm';
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'medium':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'low':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-brand-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-brand-600 bg-clip-text text-transparent">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-600 mt-1">{subtitle}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Generated: {new Date().toLocaleDateString()}</span>
                <span>•</span>
                <span>{sections.length} sections</span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>Professional Report</span>
                </span>
              </div>
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      </motion.div>

      {/* Report Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSections.map((section, index) => {
          const IconComponent = section.icon;
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${getSectionGridClass(section.size)} ${getSectionBackground(section.background)} rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300`}
            >
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-brand-100 to-blue-100 rounded-lg">
                      <IconComponent className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getPriorityIndicator(section.priority)}
                        <span className="text-xs text-gray-500 capitalize">{section.priority} priority</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Content */}
              <div className="p-6">
                {section.content}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Report Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="bg-gradient-to-r from-gray-50/90 to-gray-100/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Report Information</h4>
              <p className="text-sm text-gray-600">
                This report was automatically generated by DreflowPro's advanced analytics engine.
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Report ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
            <div>Version: 1.0</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Predefined section templates
export const createKPISection = (metrics: any[]): ReportSection => ({
  id: 'kpi-metrics',
  title: 'Key Performance Indicators',
  icon: Target,
  priority: 'high',
  size: 'full',
  content: (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <div key={index} className="text-center p-4 bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl">
            <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
            <div className="text-sm font-medium text-gray-700">{metric.title}</div>
            {metric.change && (
              <div className={`text-xs mt-1 ${metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                {metric.changeType === 'increase' ? '↗' : '↘'} {Math.abs(metric.change)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  )
});

export const createInsightsSection = (insights: any[]): ReportSection => ({
  id: 'insights',
  title: 'AI-Generated Insights',
  icon: Zap,
  priority: 'high',
  size: 'full',
  content: (
    <div className="space-y-4">
      {insights.slice(0, 3).map((insight, index) => (
        <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {index + 1}
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">{insight.title || `Insight ${index + 1}`}</h4>
              <p className="text-sm text-gray-600">{insight.description || 'Data pattern identified'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
});

export const createDataQualitySection = (qualityScore: number): ReportSection => ({
  id: 'data-quality',
  title: 'Data Quality Assessment',
  icon: CheckCircle,
  priority: 'medium',
  size: 'half',
  content: (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - qualityScore / 100)}`}
            className={qualityScore >= 80 ? 'text-green-500' : qualityScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{qualityScore}%</span>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        {qualityScore >= 80 ? 'Excellent' : qualityScore >= 60 ? 'Good' : 'Needs Improvement'}
      </div>
    </div>
  )
});

export default ReportLayoutSystem;

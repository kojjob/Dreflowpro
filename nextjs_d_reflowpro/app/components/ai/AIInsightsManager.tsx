'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Zap, BarChart3 } from 'lucide-react';

const AIInsightsManager: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent mb-2">
          AI Insights & Recommendations
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Leverage artificial intelligence to discover patterns, optimize performance, and get actionable insights from your data.
        </p>
      </motion.div>

      {/* AI Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { title: 'Insights Generated', value: '47', icon: Lightbulb, color: 'yellow' },
          { title: 'Optimizations', value: '12', icon: Target, color: 'green' },
          { title: 'Anomalies Detected', value: '3', icon: AlertTriangle, color: 'red' },
          { title: 'Performance Boost', value: '+23%', icon: TrendingUp, color: 'blue' }
        ].map((metric, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${metric.color}-100 rounded-xl flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 text-${metric.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* AI Insights Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Performance Insights */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Performance Insights</h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                type: 'optimization',
                title: 'Pipeline Bottleneck Detected',
                description: 'Data transformation step in Customer Pipeline is 40% slower than optimal',
                impact: 'High',
                action: 'Optimize SQL query'
              },
              {
                type: 'recommendation',
                title: 'Resource Scaling Opportunity',
                description: 'Consider increasing memory allocation during peak hours (2-4 PM)',
                impact: 'Medium',
                action: 'Auto-scale configuration'
              },
              {
                type: 'insight',
                title: 'Data Pattern Discovery',
                description: 'Weekly data volume peaks correlate with marketing campaigns',
                impact: 'Low',
                action: 'Schedule optimization'
              }
            ].map((insight, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    insight.impact === 'High' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {insight.impact} Impact
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  {insight.action} →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality Insights */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Data Quality Insights</h2>
          </div>
          
          <div className="space-y-4">
            {[
              {
                metric: 'Data Completeness',
                value: '94.2%',
                trend: '+2.1%',
                status: 'good'
              },
              {
                metric: 'Schema Consistency',
                value: '98.7%',
                trend: '+0.5%',
                status: 'excellent'
              },
              {
                metric: 'Duplicate Records',
                value: '0.3%',
                trend: '-0.2%',
                status: 'excellent'
              },
              {
                metric: 'Data Freshness',
                value: '89.1%',
                trend: '-1.2%',
                status: 'warning'
              }
            ].map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="font-medium text-gray-900">{metric.metric}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                    <span className={`text-sm font-medium ${
                      metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.trend}
                    </span>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  metric.status === 'excellent' ? 'bg-green-500' :
                  metric.status === 'good' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Smart Recommendations</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Implement Data Caching',
              description: 'Add Redis caching layer to reduce database load by 35%',
              effort: 'Medium',
              savings: '$2,400/month'
            },
            {
              title: 'Optimize Data Partitioning',
              description: 'Partition large tables by date to improve query performance',
              effort: 'High',
              savings: '45% faster queries'
            },
            {
              title: 'Automate Data Validation',
              description: 'Set up automated data quality checks to catch issues early',
              effort: 'Low',
              savings: '60% fewer errors'
            },
            {
              title: 'Implement Incremental Loading',
              description: 'Switch to incremental data loading for large datasets',
              effort: 'Medium',
              savings: '70% faster processing'
            }
          ].map((recommendation, index) => (
            <div key={index} className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h4>
              <p className="text-gray-600 text-sm mb-4">{recommendation.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500">Effort: {recommendation.effort}</span>
                  <span className="text-xs font-medium text-green-600">Saves: {recommendation.savings}</span>
                </div>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Implement
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Coming Soon Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Advanced AI Features Coming Soon</h3>
          <p className="text-purple-700">
            Predictive analytics, automated optimization, and natural language query interface are in development.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AIInsightsManager;

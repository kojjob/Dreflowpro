'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Zap, BarChart3, RefreshCw, Clock, Activity, Bot, Settings, Monitor } from 'lucide-react';
import { aiService, AIInsightsData, Anomaly, Prediction, Pattern, Recommendation } from '../../services/aiService';
import MLDashboard from './MLDashboard';
import TelemetryMonitor from '../monitoring/TelemetryMonitor';

const AIInsightsManager: React.FC = () => {
  const [insights, setInsights] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'ml' | 'telemetry'>('insights');

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiService.getInsights(timeRange);
      setInsights(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  // Set up real-time updates (if we had organization context)
  useEffect(() => {
    // This would normally get the organization ID from auth context
    // For now, we'll just refresh periodically
    const interval = setInterval(() => {
      if (!loading) {
        loadInsights();
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [loading, timeRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

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
        
        {/* Tab Navigation */}
        <div className="flex items-center justify-center space-x-2 mt-6 mb-6">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'insights' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Brain className="w-5 h-5" />
            <span>AI Insights</span>
          </button>
          <button
            onClick={() => setActiveTab('ml')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'ml' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span>ML Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'telemetry' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span>Telemetry</span>
          </button>
        </div>
        
        {/* Controls - Only show for insights tab */}
        {activeTab === 'insights' && (
          <div className="flex items-center justify-center space-x-4 mt-6">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button
            onClick={loadInsights}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          {lastUpdated && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}
      </motion.div>

      {/* ML Dashboard */}
      {activeTab === 'ml' && <MLDashboard />}
      
      {/* Telemetry Monitor */}
      {activeTab === 'telemetry' && <TelemetryMonitor />}

      {/* AI Insights Content - Only show when insights tab is active */}
      {activeTab === 'insights' && (
        <>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading AI insights...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Error loading insights</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadInsights}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* AI Metrics */}
      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Insights</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.total_insights}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Anomalies Detected</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.anomalies_detected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Predictions Made</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.predictions_generated}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Recommendations</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.recommendations_available}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Insights Cards */}
      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Anomalies */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Anomalies Detected</h2>
            </div>
            
            <div className="space-y-4">
              {insights.anomalies.length > 0 ? (
                insights.anomalies.slice(0, 3).map((anomaly, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {anomaly.metric_name.replace('_', ' ')} Anomaly
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{anomaly.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Score: {anomaly.anomaly_score.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        Current: {anomaly.current_value.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No anomalies detected in the selected time range</p>
                </div>
              )}
            </div>
          </div>

          {/* Predictions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Predictions</h2>
            </div>
            
            <div className="space-y-4">
              {insights.predictions.length > 0 ? (
                insights.predictions.slice(0, 3).map((prediction, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {prediction.pipeline_name || 'Pipeline'} {prediction.prediction_type.replace('_', ' ')}
                      </h4>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {prediction.confidence_score.toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{prediction.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Predicted: {prediction.predicted_value.toFixed(1)} {prediction.unit}
                      </span>
                      <span className="text-gray-500">
                        Horizon: {aiService.formatPredictionHorizon(prediction.prediction_horizon)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No predictions available</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Recommendations */}
      {insights && insights.recommendations.length > 0 && (
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
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h4>
                <p className="text-gray-600 text-sm mb-4">{recommendation.description}</p>
                
                {/* Implementation Steps */}
                {recommendation.implementation_steps.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Implementation steps:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {recommendation.implementation_steps.slice(0, 2).map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start">
                          <span className="inline-block w-1 h-1 bg-purple-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {step}
                        </li>
                      ))}
                      {recommendation.implementation_steps.length > 2 && (
                        <li className="text-purple-600">+ {recommendation.implementation_steps.length - 2} more steps</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(recommendation.impact)}`}>
                      {recommendation.impact} Impact
                    </span>
                    <span className="text-xs text-gray-500">
                      {recommendation.effort} Effort
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-green-600 mb-1">
                      {recommendation.estimated_improvement}
                    </p>
                    {recommendation.estimated_savings && (
                      <p className="text-xs text-gray-500">
                        Saves: {recommendation.estimated_savings}
                      </p>
                    )}
                  </div>
                </div>

                <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Patterns Discovery */}
      {insights && insights.patterns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Discovered Patterns</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.patterns.map((pattern, index) => (
              <div key={index} className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{pattern.pattern_name}</h4>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {(pattern.confidence_score * 100).toFixed(0)}% confidence
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{pattern.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{pattern.pattern_type} Pattern</span>
                  {pattern.affected_entities && (
                    <span>{pattern.affected_entities.length} entities affected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Performance Summary */}
      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200"
        >
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">AI Performance Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {insights.performance_metrics.average_confidence_score}%
                </div>
                <div className="text-sm text-purple-600">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {insights.performance_metrics.high_confidence_insights}
                </div>
                <div className="text-sm text-purple-600">High Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {insights.performance_metrics.critical_insights_detected}
                </div>
                <div className="text-sm text-purple-600">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {insights.performance_metrics.total_insights_generated}
                </div>
                <div className="text-sm text-purple-600">Total Generated</div>
              </div>
            </div>
            
            <p className="text-purple-700 text-sm">
              AI insights are continuously updated based on your pipeline data. 
              Check back regularly for new recommendations and optimizations.
            </p>
          </div>
        </motion.div>
      )}

      {/* No Data State */}
      {insights && insights.summary.total_insights === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-12 border border-blue-200 text-center"
        >
          <Brain className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Building Your AI Profile</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            AI insights will appear here once you have some pipeline execution data. 
            Run a few pipelines to start getting intelligent recommendations!
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>✨ Anomaly detection</p>
            <p>🔮 Performance predictions</p>
            <p>📊 Pattern discovery</p>
            <p>💡 Optimization recommendations</p>
          </div>
        </motion.div>
      )}
        </>
      )}
    </div>
  );
};

export default AIInsightsManager;

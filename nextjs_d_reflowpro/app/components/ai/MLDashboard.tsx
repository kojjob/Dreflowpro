'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  TrendingUp, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Settings,
  Activity,
  BarChart3,
  Brain,
  Target,
  Clock,
  Award
} from 'lucide-react';
import { aiService } from '../../services/aiService';

interface ModelStatus {
  models_trained: boolean;
  last_trained: string | null;
  model_versions: Record<string, string>;
  training_in_progress: boolean;
  next_training_scheduled: string | null;
}

interface ModelPerformance {
  accuracy: Record<string, number>;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1_score: Record<string, number>;
  training_samples: Record<string, number>;
  last_evaluated: string;
}

const MLDashboard: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance | null>(null);
  const [mlHealth, setMLHealth] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMLData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusData, performanceData, healthData, predictionsData] = await Promise.all([
        aiService.getModelStatus().catch(() => null),
        aiService.getModelPerformance().catch(() => null),
        aiService.getMLHealth().catch(() => null),
        aiService.makePredictions().catch(() => null)
      ]);

      setModelStatus(statusData);
      setModelPerformance(performanceData);
      setMLHealth(healthData);
      setPredictions(predictionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ML data');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModels = async (forceRetrain = false) => {
    try {
      setTrainingLoading(true);
      await aiService.trainModels(forceRetrain);
      
      // Wait a bit then reload status
      setTimeout(() => {
        loadMLData();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
    } finally {
      setTrainingLoading(false);
    }
  };

  useEffect(() => {
    loadMLData();
  }, []);

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Machine Learning Dashboard</h2>
              <p className="text-gray-600">Monitor and manage AI models for pipeline optimization</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => handleTrainModels(false)}
              disabled={trainingLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Bot className={`w-4 h-4 ${trainingLoading ? 'animate-pulse' : ''}`} />
              <span>{trainingLoading ? 'Training...' : 'Train Models'}</span>
            </button>
            
            <button
              onClick={() => handleTrainModels(true)}
              disabled={trainingLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${trainingLoading ? 'animate-spin' : ''}`} />
              <span>Retrain</span>
            </button>
          </div>
        </div>

        {/* ML Health Status */}
        {mlHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <div className={`w-3 h-3 rounded-full ${mlHealth.ml_service_status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm text-gray-600">ML Service</p>
                <p className="font-semibold capitalize">{mlHealth.ml_service_status}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Features Available</p>
                <p className="font-semibold">{mlHealth.features_available?.length || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <Settings className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Libraries</p>
                <p className="font-semibold">{Object.keys(mlHealth.libraries || {}).length}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Model Status */}
      {modelStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span>Model Training Status</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(modelStatus.models_trained)}`}>
                {modelStatus.models_trained ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Trained
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Not Trained
                  </>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-2">Training Status</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(modelStatus.model_versions || {}).length}
              </div>
              <p className="text-gray-600 text-sm">Active Models</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${modelStatus.training_in_progress ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-100'}`}>
                {modelStatus.training_in_progress ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    In Progress
                  </>
                ) : (
                  'Idle'
                )}
              </div>
              <p className="text-gray-600 text-sm mt-2">Training State</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-sm font-medium text-gray-900">
                {modelStatus.last_trained ? new Date(modelStatus.last_trained).toLocaleDateString() : 'Never'}
              </div>
              <p className="text-gray-600 text-sm">Last Trained</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Model Performance */}
      {modelPerformance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Model Performance Metrics</span>
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Accuracy Scores */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Accuracy Scores</h4>
              <div className="space-y-3">
                {Object.entries(modelPerformance.accuracy || {}).map(([model, score]) => (
                  <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {model.replace('_', ' ')} Model
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPerformanceColor(score)}`}>
                        {(score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* F1 Scores */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">F1 Scores</h4>
              <div className="space-y-3">
                {Object.entries(modelPerformance.f1_score || {}).map(([model, score]) => (
                  <div key={model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {model.replace('_', ' ')} Model
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPerformanceColor(score)}`}>
                        {(score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Training Data Summary */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">Training Data</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(modelPerformance.training_samples || {}).map(([model, samples]) => (
                <div key={model} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{samples.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 capitalize">{model.replace('_', ' ')} Samples</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Last evaluated: {new Date(modelPerformance.last_evaluated).toLocaleString()}
            </p>
          </div>
        </motion.div>
      )}

      {/* Recent Predictions */}
      {predictions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span>Recent ML Predictions</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {predictions.execution_time_predictions && (
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Execution Time</h4>
                </div>
                <div className="text-2xl font-bold text-blue-800 mb-1">
                  {predictions.execution_time_predictions.predicted_time?.toFixed(1) || 'N/A'}s
                </div>
                <p className="text-sm text-blue-600">
                  {predictions.execution_time_predictions.confidence_score ? 
                    `${(predictions.execution_time_predictions.confidence_score * 100).toFixed(0)}% confidence` : 
                    'Analyzing...'
                  }
                </p>
              </div>
            )}
            
            {predictions.failure_risk && (
              <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-gray-900">Failure Risk</h4>
                </div>
                <div className="text-2xl font-bold text-red-800 mb-1">
                  {predictions.failure_risk.risk_score ? 
                    `${(predictions.failure_risk.risk_score * 100).toFixed(0)}%` : 
                    'Low'
                  }
                </div>
                <p className="text-sm text-red-600">
                  Risk Assessment
                </p>
              </div>
            )}
            
            {predictions.resource_optimization && (
              <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Resource Usage</h4>
                </div>
                <div className="text-2xl font-bold text-green-800 mb-1">
                  {predictions.resource_optimization.cpu_prediction ? 
                    `${predictions.resource_optimization.cpu_prediction.toFixed(0)}%` : 
                    'Optimal'
                  }
                </div>
                <p className="text-sm text-green-600">
                  CPU Prediction
                </p>
              </div>
            )}
          </div>
          
          {predictions.recommendations && predictions.recommendations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span>ML Recommendations</span>
              </h4>
              <div className="space-y-3">
                {predictions.recommendations.slice(0, 3).map((rec: any, index: number) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h5 className="font-medium text-purple-900 mb-1">{rec.title}</h5>
                    <p className="text-sm text-purple-700">{rec.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-purple-600">{rec.category}</span>
                      <span className="text-xs text-purple-600 font-medium">{rec.impact} Impact</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ML dashboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Error loading ML data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadMLData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* No Models State */}
      {!loading && modelStatus && !modelStatus.models_trained && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12 border border-blue-200 text-center">
          <Bot className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Train Your First ML Models</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start by training machine learning models on your pipeline data to get intelligent predictions and optimizations.
          </p>
          <button
            onClick={() => handleTrainModels(false)}
            disabled={trainingLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {trainingLoading ? 'Training...' : 'Train Models Now'}
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-sm text-gray-500">
            <div className="flex flex-col items-center">
              <Clock className="w-6 h-6 mb-2 text-blue-400" />
              <span>Execution Time Prediction</span>
            </div>
            <div className="flex flex-col items-center">
              <AlertCircle className="w-6 h-6 mb-2 text-red-400" />
              <span>Failure Risk Assessment</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-6 h-6 mb-2 text-green-400" />
              <span>Resource Optimization</span>
            </div>
            <div className="flex flex-col items-center">
              <Award className="w-6 h-6 mb-2 text-purple-400" />
              <span>Performance Recommendations</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MLDashboard;
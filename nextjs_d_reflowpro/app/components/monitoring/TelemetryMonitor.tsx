'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Monitor, 
  Cpu, 
  HardDrive, 
  Network, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  timestamp: string;
}

interface PipelineHealth {
  pipeline_id: string;
  pipeline_name: string;
  health_score: number;
  status: 'healthy' | 'warning' | 'critical';
  last_execution: string;
  success_rate: number;
  avg_execution_time: number;
}

const TelemetryMonitor: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Simulate real-time telemetry data
  useEffect(() => {
    const generateMockMetrics = (): SystemMetrics => ({
      cpu_usage: Math.random() * 100,
      memory_usage: 40 + Math.random() * 40,
      disk_usage: 20 + Math.random() * 30,
      network_io: Math.random() * 1000,
      timestamp: new Date().toISOString(),
    });

    const generateMockPipelineHealth = (): PipelineHealth[] => [
      {
        pipeline_id: '1',
        pipeline_name: 'Daily Data Processing',
        health_score: 85 + Math.random() * 15,
        status: Math.random() > 0.8 ? 'warning' : 'healthy',
        last_execution: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        success_rate: 90 + Math.random() * 10,
        avg_execution_time: 120 + Math.random() * 60
      },
      {
        pipeline_id: '2',
        pipeline_name: 'Customer Analytics ETL',
        health_score: 75 + Math.random() * 20,
        status: Math.random() > 0.9 ? 'critical' : 'healthy',
        last_execution: new Date(Date.now() - Math.random() * 1800000).toISOString(),
        success_rate: 85 + Math.random() * 15,
        avg_execution_time: 200 + Math.random() * 100
      },
      {
        pipeline_id: '3',
        pipeline_name: 'Real-time Streaming',
        health_score: 90 + Math.random() * 10,
        status: 'healthy',
        last_execution: new Date(Date.now() - Math.random() * 300000).toISOString(),
        success_rate: 95 + Math.random() * 5,
        avg_execution_time: 45 + Math.random() * 30
      }
    ];

    // Simulate connection
    setIsConnected(true);
    
    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      setSystemMetrics(generateMockMetrics());
      setPipelineHealth(generateMockPipelineHealth());
      setLastUpdate(new Date());
    }, 5000);

    // Initialize with first data
    setSystemMetrics(generateMockMetrics());
    setPipelineHealth(generateMockPipelineHealth());
    setLastUpdate(new Date());

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    return `${bytes.toFixed(1)} MB/s`;
  };

  const formatTime = (seconds: number) => {
    return `${Math.round(seconds)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Real-time Telemetry Monitor</h2>
              <p className="text-gray-600">Live system and pipeline performance metrics</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {lastUpdate && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* System Metrics */}
      {systemMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Monitor className="w-6 h-6 text-blue-600" />
            <span>System Performance</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                </div>
                <span className="text-lg font-bold text-blue-800">
                  {formatPercentage(systemMetrics.cpu_usage)}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(systemMetrics.cpu_usage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                </div>
                <span className="text-lg font-bold text-green-800">
                  {formatPercentage(systemMetrics.memory_usage)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(systemMetrics.memory_usage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Disk Usage</span>
                </div>
                <span className="text-lg font-bold text-purple-800">
                  {formatPercentage(systemMetrics.disk_usage)}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(systemMetrics.disk_usage, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Network className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Network I/O</span>
                </div>
                <span className="text-lg font-bold text-orange-800">
                  {formatBytes(systemMetrics.network_io)}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-orange-600">
                <TrendingUp className="w-3 h-3" />
                <span>Real-time throughput</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pipeline Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Zap className="w-6 h-6 text-purple-600" />
          <span>Pipeline Health</span>
        </h3>
        
        <div className="space-y-4">
          {pipelineHealth.map((pipeline) => (
            <div key={pipeline.pipeline_id} className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    pipeline.status === 'healthy' ? 'bg-green-100' :
                    pipeline.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    {pipeline.status === 'healthy' ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> :
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    }
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{pipeline.pipeline_name}</h4>
                    <p className="text-sm text-gray-600">ID: {pipeline.pipeline_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pipeline.status)}`}>
                    {pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                  </span>
                  <span className={`text-2xl font-bold ${getHealthScoreColor(pipeline.health_score)}`}>
                    {Math.round(pipeline.health_score)}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Success Rate</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatPercentage(pipeline.success_rate)}
                  </div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Avg Execution</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatTime(pipeline.avg_execution_time)}
                  </div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Last Run</div>
                  <div className="text-sm font-medium text-gray-800">
                    {new Date(pipeline.last_execution).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Telemetry Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Telemetry Benefits</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800">99.9%</div>
              <div className="text-sm text-purple-600">Uptime Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800">-40%</div>
              <div className="text-sm text-purple-600">Resource Waste</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800">5sec</div>
              <div className="text-sm text-purple-600">Detection Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800">24/7</div>
              <div className="text-sm text-purple-600">Monitoring</div>
            </div>
          </div>
          <p className="text-purple-700 text-sm">
            Real-time telemetry enables proactive issue detection, resource optimization, 
            and ensures your ETL pipelines run at peak performance.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TelemetryMonitor;
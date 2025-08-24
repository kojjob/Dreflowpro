'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Download, Calendar, Filter, Search } from 'lucide-react';

const ReportsManager: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent mb-2">
          Reports & Analytics
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Generate comprehensive reports and analytics from your data pipelines and processing workflows.
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { title: 'Total Reports', value: '24', icon: FileText, color: 'blue' },
          { title: 'This Month', value: '8', icon: Calendar, color: 'green' },
          { title: 'Downloads', value: '156', icon: Download, color: 'purple' },
          { title: 'Scheduled', value: '12', icon: BarChart3, color: 'orange' }
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Reports Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Available Reports</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Pipeline Performance Report',
              description: 'Comprehensive analysis of pipeline execution metrics',
              lastGenerated: '2 hours ago',
              status: 'Ready'
            },
            {
              title: 'Data Quality Assessment',
              description: 'Data validation and quality metrics across all sources',
              lastGenerated: '1 day ago',
              status: 'Ready'
            },
            {
              title: 'Monthly Processing Summary',
              description: 'Monthly overview of data processing and throughput',
              lastGenerated: '3 days ago',
              status: 'Scheduled'
            },
            {
              title: 'Error Analysis Report',
              description: 'Detailed analysis of processing errors and failures',
              lastGenerated: '5 hours ago',
              status: 'Ready'
            },
            {
              title: 'Resource Utilization',
              description: 'System resource usage and optimization recommendations',
              lastGenerated: '1 week ago',
              status: 'Generating'
            },
            {
              title: 'Custom Analytics Dashboard',
              description: 'User-defined metrics and KPI tracking',
              lastGenerated: 'Never',
              status: 'Draft'
            }
          ].map((report, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{report.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.status === 'Ready' ? 'bg-green-100 text-green-800' :
                  report.status === 'Generating' ? 'bg-blue-100 text-blue-800' :
                  report.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {report.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Last: {report.lastGenerated}</span>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View
                  </button>
                  <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Coming Soon Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Enhanced Reporting Features Coming Soon</h3>
          <p className="text-blue-700">
            Advanced report scheduling, custom templates, and automated delivery options are in development.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ReportsManager;

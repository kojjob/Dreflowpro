'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Download, Calendar, Filter, Search, Plus, Eye, Trash2 } from 'lucide-react';
import { reportsApi, Report, ReportStatistics } from '../../services/reports';
import ReportProgressModal from './ReportProgressModal';
import ReportProgressIndicator from './ReportProgressIndicator';

const ReportsManager: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [statistics, setStatistics] = useState<ReportStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const [progressModalReportId, setProgressModalReportId] = useState<string | null>(null);

  // Load reports and statistics on component mount
  useEffect(() => {
    loadReports();
    loadStatistics();
  }, [statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.listReports({
        status: statusFilter || undefined,
        report_type: typeFilter || undefined,
        limit: 50,
        offset: 0
      });
      
      if (response.success) {
        setReports(response.data.reports);
      } else {
        setError('Failed to load reports');
      }
    } catch (err) {
      setError('Failed to load reports: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await reportsApi.getReportStatistics(30);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  const handleDownloadReport = async (reportId: string, fileName?: string) => {
    try {
      const blob = await reportsApi.downloadReport(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName || `report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Reload reports to update download count
      loadReports();
    } catch (err) {
      setError('Failed to download report: ' + (err as Error).message);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await reportsApi.deleteReport(reportId);
      if (response.success) {
        loadReports();
        loadStatistics();
      } else {
        setError('Failed to delete report');
      }
    } catch (err) {
      setError('Failed to delete report: ' + (err as Error).message);
    }
  };

  const handleGenerateReport = async (reportId: string) => {
    try {
      setGeneratingReports(prev => new Set(prev).add(reportId));
      setProgressModalReportId(reportId);
      
      const response = await reportsApi.generateReport(reportId);
      if (!response.success) {
        setError('Failed to start report generation');
        setGeneratingReports(prev => {
          const newSet = new Set(prev);
          newSet.delete(reportId);
          return newSet;
        });
        setProgressModalReportId(null);
      }
    } catch (err) {
      setError('Failed to generate report: ' + (err as Error).message);
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
      setProgressModalReportId(null);
    }
  };

  const handleProgressComplete = (reportId: string) => {
    setGeneratingReports(prev => {
      const newSet = new Set(prev);
      newSet.delete(reportId);
      return newSet;
    });
    loadReports();
    loadStatistics();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'EXECUTIVE': return 'Executive';
      case 'ANALYST': return 'Analyst';
      case 'PRESENTATION': return 'Presentation';
      case 'DASHBOARD_EXPORT': return 'Dashboard';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { 
            title: 'Total Reports', 
            value: statistics?.total_reports?.toString() || '0', 
            icon: FileText, 
            color: 'blue' 
          },
          { 
            title: 'This Month', 
            value: statistics?.completed_reports?.toString() || '0', 
            icon: Calendar, 
            color: 'green' 
          },
          { 
            title: 'Downloads', 
            value: statistics?.total_downloads?.toString() || '0', 
            icon: Download, 
            color: 'purple' 
          },
          { 
            title: 'Pending', 
            value: statistics?.pending_reports?.toString() || '0', 
            icon: BarChart3, 
            color: 'orange' 
          }
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </p>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="GENERATING">Generating</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="EXECUTIVE">Executive</option>
              <option value="ANALYST">Analyst</option>
              <option value="PRESENTATION">Presentation</option>
              <option value="DASHBOARD_EXPORT">Dashboard</option>
            </select>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Report</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading reports...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter || typeFilter 
                ? "Try adjusting your search or filters" 
                : "Create your first report to get started"
              }
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <span className="text-xs text-gray-500">
                      {getReportTypeLabel(report.report_type)} • {report.format}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {report.description || `${getReportTypeLabel(report.report_type)} report for data analysis`}
                </p>

                {/* Progress Indicator for Generating Reports */}
                {(report.status === 'GENERATING' || generatingReports.has(report.id)) && (
                  <div className="mb-4">
                    <ReportProgressIndicator
                      reportId={report.id}
                      onComplete={handleProgressComplete}
                      compact={true}
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-gray-500">
                    {report.generated_at ? `Generated: ${formatDate(report.generated_at)}` : `Created: ${formatDate(report.created_at)}`}
                  </span>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span>↓ {report.download_count}</span>
                    <span>👁 {report.view_count}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>

                  {/* Generate button for pending reports */}
                  {report.status === 'PENDING' && !generatingReports.has(report.id) && (
                    <button 
                      onClick={() => handleGenerateReport(report.id)}
                      className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  )}
                  
                  {report.status === 'COMPLETED' && report.file_path && (
                    <button 
                      onClick={() => handleDownloadReport(report.id, report.file_name)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-medium ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Activity */}
      {statistics && statistics.recent_reports && statistics.recent_reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Recent Report Activity</h3>
          <div className="space-y-3">
            {statistics.recent_reports.slice(0, 3).map((report) => (
              <div key={report.id} className="flex items-center justify-between bg-white/50 rounded-lg p-3">
                <div>
                  <p className="font-medium text-blue-900">{report.title}</p>
                  <p className="text-sm text-blue-600">{formatDate(report.created_at)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Progress Modal */}
      {progressModalReportId && (
        <ReportProgressModal
          reportId={progressModalReportId}
          isOpen={true}
          onClose={() => setProgressModalReportId(null)}
          onComplete={handleProgressComplete}
        />
      )}
    </div>
  );
};

export default ReportsManager;

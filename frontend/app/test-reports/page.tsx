'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '../services/reports';

export default function TestReportsPage() {
  const [statisticsResult, setStatisticsResult] = useState<any>(null);
  const [reportsResult, setReportsResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testReportStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Testing report statistics...');
      const result = await reportsApi.getReportStatistics(30);
      console.log('✅ Statistics result:', result);
      setStatisticsResult(result);
    } catch (err) {
      console.error('❌ Statistics error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testListReports = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🧪 Testing list reports...');
      const result = await reportsApi.listReports({ limit: 10 });
      console.log('✅ Reports result:', result);
      setReportsResult(result);
    } catch (err) {
      console.error('❌ Reports error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run tests on component mount
  useEffect(() => {
    console.log('🚀 Auto-running reports tests...');
    testReportStatistics();
    setTimeout(() => testListReports(), 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports API Test</h1>
          <p className="text-gray-600 mb-8">
            This page tests the reports API functionality to verify the error fix.
            Check the browser console for detailed logs.
          </p>

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={testReportStatistics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Testing...' : 'Test Statistics API'}
            </button>
            
            <button
              onClick={testListReports}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Testing...' : 'Test List Reports API'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-medium mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistics Results */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Statistics Results
              </h3>
              {statisticsResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success:</span>
                    <span className={statisticsResult.success ? 'text-green-600' : 'text-red-600'}>
                      {statisticsResult.success ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  {statisticsResult.success && statisticsResult.data && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Reports:</span>
                        <span className="font-medium">{statisticsResult.data.total_reports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium">{statisticsResult.data.completed_reports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Failed:</span>
                        <span className="font-medium">{statisticsResult.data.failed_reports}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Downloads:</span>
                        <span className="font-medium">{statisticsResult.data.total_downloads}</span>
                      </div>
                    </>
                  )}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Raw Data
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto">
                      {JSON.stringify(statisticsResult, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-gray-500">No statistics data yet. Click the test button above.</p>
              )}
            </div>

            {/* Reports List Results */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📋 Reports List Results
              </h3>
              {reportsResult ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success:</span>
                    <span className={reportsResult.success ? 'text-green-600' : 'text-red-600'}>
                      {reportsResult.success ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  {reportsResult.success && reportsResult.data && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reports Count:</span>
                        <span className="font-medium">{reportsResult.data.reports?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Count:</span>
                        <span className="font-medium">{reportsResult.data.total_count || 0}</span>
                      </div>
                      {reportsResult.data.reports && reportsResult.data.reports.length > 0 && (
                        <div className="mt-3">
                          <p className="text-gray-600 text-sm mb-2">Sample Reports:</p>
                          {reportsResult.data.reports.slice(0, 3).map((report: any, index: number) => (
                            <div key={index} className="text-sm bg-white p-2 rounded mb-1">
                              <div className="font-medium">{report.title}</div>
                              <div className="text-gray-500">
                                {report.report_type} • {report.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Raw Data
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                      {JSON.stringify(reportsResult, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="text-gray-500">No reports data yet. Click the test button above.</p>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Test Status</h4>
            <p className="text-blue-700 text-sm">
              {loading ? (
                '🔄 Running tests...'
              ) : error ? (
                '❌ Tests failed - check error above'
              ) : statisticsResult && reportsResult ? (
                '✅ All tests completed successfully!'
              ) : (
                '⏳ Ready to run tests'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

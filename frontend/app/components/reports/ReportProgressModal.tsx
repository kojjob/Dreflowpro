'use client';

import { useState, useEffect } from 'react';
import { useReportProgress } from '../../hooks/useReportProgress';

interface ReportProgressModalProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (reportId: string) => void;
}

export default function ReportProgressModal({
  reportId,
  isOpen,
  onClose,
  onComplete
}: ReportProgressModalProps) {
  const {
    progress,
    isCompleted,
    isFailed,
    isGenerating,
    progressPercentage,
    currentStep,
    estimatedTimeRemaining,
    connectionError
  } = useReportProgress({
    reportId,
    autoStart: isOpen,
    onCompleted: (progress) => {
      setTimeout(() => {
        onComplete?.(reportId);
        onClose();
      }, 2000); // Show completion for 2 seconds
    },
    onError: (error, progress) => {
      console.error('Report generation error:', error);
    }
  });

  const formatTime = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusColor = () => {
    if (isFailed) return 'text-red-600';
    if (isCompleted) return 'text-green-600';
    if (isGenerating) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (isFailed) return 'Failed';
    if (isCompleted) return 'Completed';
    if (isGenerating) return 'Generating';
    return 'Pending';
  };

  const getProgressBarColor = () => {
    if (isFailed) return 'bg-red-500';
    if (isCompleted) return 'bg-green-500';
    return 'bg-blue-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Report Generation
          </h3>
          {(isCompleted || isFailed) && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Connection issue: {connectionError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progressPercentage}% complete</span>
            {estimatedTimeRemaining && (
              <span>~{formatTime(estimatedTimeRemaining)} remaining</span>
            )}
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-700 block mb-1">
              Current Step
            </span>
            <div className="flex items-center">
              {isGenerating && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2" />
              )}
              <span className="text-sm text-gray-600">{currentStep}</span>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isCompleted && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-green-800">
                Report generated successfully! It will be available for download shortly.
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {isFailed && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-red-800">
                Report generation failed. {progress.error || 'Please try again.'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          {!isCompleted && !isFailed && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Run in Background
            </button>
          )}
          
          {isFailed && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
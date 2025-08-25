'use client';

import { useReportProgress } from '../../hooks/useReportProgress';

interface ReportProgressIndicatorProps {
  reportId: string;
  onComplete?: (reportId: string) => void;
  compact?: boolean;
}

export default function ReportProgressIndicator({
  reportId,
  onComplete,
  compact = false
}: ReportProgressIndicatorProps) {
  const {
    progress,
    isCompleted,
    isFailed,
    isGenerating,
    progressPercentage,
    currentStep,
    estimatedTimeRemaining
  } = useReportProgress({
    reportId,
    autoStart: true,
    onCompleted: (progress) => {
      onComplete?.(reportId);
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

  const getStatusIcon = () => {
    if (isFailed) {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    
    if (isCompleted) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    if (isGenerating) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      );
    }
    
    return (
      <div className="w-4 h-4 rounded-full bg-gray-300" />
    );
  };

  const getProgressBarColor = () => {
    if (isFailed) return 'bg-red-500';
    if (isCompleted) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (isFailed) return 'Failed';
    if (isCompleted) return 'Completed';
    if (isGenerating) return 'Generating';
    return 'Pending';
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-500 min-w-0">
          {progressPercentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">
            {getStatusText()}
          </span>
        </div>
        {estimatedTimeRemaining && isGenerating && (
          <span className="text-xs text-gray-500">
            ~{formatTime(estimatedTimeRemaining)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{progressPercentage}% complete</span>
        </div>
      </div>

      {/* Current Step */}
      {currentStep && isGenerating && (
        <div className="text-xs text-gray-600">
          {currentStep}
        </div>
      )}

      {/* Error Message */}
      {isFailed && progress.error && (
        <div className="text-xs text-red-600 mt-1">
          {progress.error}
        </div>
      )}

      {/* Success Message */}
      {isCompleted && (
        <div className="text-xs text-green-600 mt-1">
          Report ready for download
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { websocketService, ReportWebSocketMessage } from '../services/websocket';

export interface ReportProgress {
  reportId: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  currentStep?: string;
  estimatedTime?: number;
  error?: string;
  fileInfo?: Record<string, any>;
  downloadUrl?: string;
  completed: boolean;
}

export interface UseReportProgressOptions {
  reportId: string;
  autoStart?: boolean;
  onProgress?: (progress: ReportProgress) => void;
  onCompleted?: (progress: ReportProgress) => void;
  onError?: (error: string, progress: ReportProgress) => void;
}

export function useReportProgress({
  reportId,
  autoStart = true,
  onProgress,
  onCompleted,
  onError
}: UseReportProgressOptions) {
  const [progress, setProgress] = useState<ReportProgress>({
    reportId,
    status: 'PENDING',
    progress: 0,
    completed: false
  });

  const [isTracking, setIsTracking] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleWebSocketMessage = useCallback((message: ReportWebSocketMessage) => {
    if (message.type === 'report_progress' && 'report_id' in message) {
      const newProgress: ReportProgress = {
        reportId: message.report_id,
        status: 'GENERATING',
        progress: message.progress,
        currentStep: message.current_step,
        estimatedTime: message.estimated_time,
        completed: false
      };
      
      setProgress(newProgress);
      onProgress?.(newProgress);
    }
    
    else if (message.type === 'report_status' && 'report_id' in message) {
      const newProgress: ReportProgress = {
        reportId: message.report_id,
        status: message.status as ReportProgress['status'],
        progress: message.progress,
        completed: message.status === 'COMPLETED',
        error: message.details?.error
      };
      
      setProgress(newProgress);
      
      if (message.status === 'FAILED' && onError) {
        onError(message.details?.error || 'Report generation failed', newProgress);
      } else {
        onProgress?.(newProgress);
      }
    }
    
    else if (message.type === 'report_completed' && 'report_id' in message) {
      const newProgress: ReportProgress = {
        reportId: message.report_id,
        status: 'COMPLETED',
        progress: 100,
        completed: true,
        fileInfo: message.file_info,
        downloadUrl: message.download_url
      };
      
      setProgress(newProgress);
      onCompleted?.(newProgress);
      setIsTracking(false);
    }
  }, [reportId, onProgress, onCompleted, onError]);

  const startTracking = useCallback(async () => {
    try {
      setConnectionError(null);
      setIsTracking(true);
      
      // Ensure WebSocket connection
      if (!websocketService.isConnected()) {
        await websocketService.connect();
      }
      
      // Subscribe to report events for this specific report
      const unsubscribe = websocketService.subscribeToAllReportEvents(handleWebSocketMessage);
      
      return unsubscribe;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to WebSocket';
      setConnectionError(errorMessage);
      setIsTracking(false);
      throw error;
    }
  }, [handleWebSocketMessage]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      reportId,
      status: 'PENDING',
      progress: 0,
      completed: false
    });
  }, [reportId]);

  // Auto-start tracking if requested
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (autoStart && reportId) {
      startTracking()
        .then((unsub) => {
          unsubscribe = unsub;
        })
        .catch(error => {
          console.error('Failed to start report progress tracking:', error);
        });
    }

    return () => {
      unsubscribe?.();
    };
  }, [autoStart, reportId, startTracking]);

  return {
    progress,
    isTracking,
    connectionError,
    startTracking,
    stopTracking,
    resetProgress,
    // Computed values for convenience
    isCompleted: progress.completed,
    isFailed: progress.status === 'FAILED',
    isGenerating: progress.status === 'GENERATING',
    progressPercentage: Math.max(0, Math.min(100, progress.progress)),
    estimatedTimeRemaining: progress.estimatedTime,
    currentStep: progress.currentStep,
    downloadUrl: progress.downloadUrl
  };
}

// Hook for tracking multiple reports
export function useMultipleReportProgress(reportIds: string[]) {
  const [progressMap, setProgressMap] = useState<Map<string, ReportProgress>>(new Map());
  const [isTracking, setIsTracking] = useState(false);

  const handleWebSocketMessage = useCallback((message: ReportWebSocketMessage) => {
    let reportId: string | undefined;
    
    if ('report_id' in message) {
      reportId = message.report_id;
    }
    
    if (!reportId || !reportIds.includes(reportId)) {
      return;
    }

    setProgressMap(prev => {
      const updated = new Map(prev);
      const currentProgress = updated.get(reportId) || {
        reportId,
        status: 'PENDING' as const,
        progress: 0,
        completed: false
      };

      if (message.type === 'report_progress') {
        updated.set(reportId, {
          ...currentProgress,
          status: 'GENERATING',
          progress: message.progress,
          currentStep: message.current_step,
          estimatedTime: message.estimated_time,
          completed: false
        });
      }
      else if (message.type === 'report_status') {
        updated.set(reportId, {
          ...currentProgress,
          status: message.status as ReportProgress['status'],
          progress: message.progress,
          completed: message.status === 'COMPLETED',
          error: message.details?.error
        });
      }
      else if (message.type === 'report_completed') {
        updated.set(reportId, {
          ...currentProgress,
          status: 'COMPLETED',
          progress: 100,
          completed: true,
          fileInfo: message.file_info,
          downloadUrl: message.download_url
        });
      }

      return updated;
    });
  }, [reportIds]);

  const startTracking = useCallback(async () => {
    try {
      setIsTracking(true);
      
      if (!websocketService.isConnected()) {
        await websocketService.connect();
      }
      
      const unsubscribe = websocketService.subscribeToAllReportEvents(handleWebSocketMessage);
      return unsubscribe;
    } catch (error) {
      setIsTracking(false);
      throw error;
    }
  }, [handleWebSocketMessage]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const getProgress = useCallback((reportId: string): ReportProgress | undefined => {
    return progressMap.get(reportId);
  }, [progressMap]);

  return {
    progressMap,
    isTracking,
    startTracking,
    stopTracking,
    getProgress,
    // Computed values
    allCompleted: Array.from(progressMap.values()).every(p => p.completed),
    anyFailed: Array.from(progressMap.values()).some(p => p.status === 'FAILED'),
    totalProgress: Array.from(progressMap.values()).reduce((sum, p) => sum + p.progress, 0) / Math.max(1, progressMap.size)
  };
}
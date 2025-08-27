'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Logger from '../../utils/logger';

interface ErrorInfo {
  id: string;
  error: Error;
  errorInfo: React.ErrorInfo | null;
  timestamp: Date;
  component: string;
  level: 'critical' | 'error' | 'warning';
  resolved: boolean;
}

interface ErrorBoundaryContextType {
  errors: ErrorInfo[];
  addError: (error: ErrorInfo) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  getErrorCount: () => number;
  hasErrors: () => boolean;
  reportError: (error: Error, errorInfo?: React.ErrorInfo) => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | undefined>(undefined);

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within ErrorBoundaryProvider');
  }
  return context;
};

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  maxErrors?: number;
  onError?: (error: ErrorInfo) => void;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({
  children,
  maxErrors = 10,
  onError
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = useCallback((errorInfo: ErrorInfo) => {
    setErrors(prevErrors => {
      const newErrors = [...prevErrors, errorInfo];
      // Keep only the last maxErrors
      if (newErrors.length > maxErrors) {
        return newErrors.slice(-maxErrors);
      }
      return newErrors;
    });
    
    // Log the error
    Logger.error(`Error in ${errorInfo.component}:`, errorInfo.error);
    
    // Call external error handler if provided
    if (onError) {
      onError(errorInfo);
    }
    
    // Send error to monitoring service (if configured)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (e.g., Sentry)
      // window.Sentry?.captureException(errorInfo.error, {
      //   tags: {
      //     component: errorInfo.component,
      //     level: errorInfo.level
      //   }
      // });
    }
  }, [maxErrors, onError]);

  const clearError = useCallback((id: string) => {
    setErrors(prevErrors => prevErrors.filter(e => e.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getErrorCount = useCallback(() => {
    return errors.filter(e => !e.resolved).length;
  }, [errors]);

  const hasErrors = useCallback(() => {
    return errors.some(e => !e.resolved);
  }, [errors]);

  const reportError = useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    addError({
      id: errorId,
      error,
      errorInfo: errorInfo || null,
      timestamp: new Date(),
      component: 'Unknown',
      level: 'error',
      resolved: false
    });
  }, [addError]);

  return (
    <ErrorBoundaryContext.Provider
      value={{
        errors,
        addError,
        clearError,
        clearAllErrors,
        getErrorCount,
        hasErrors,
        reportError
      }}
    >
      {children}
    </ErrorBoundaryContext.Provider>
  );
};
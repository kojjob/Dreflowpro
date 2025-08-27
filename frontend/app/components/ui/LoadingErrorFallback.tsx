'use client';

import React from 'react';
import { Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from './Button';

export interface LoadingErrorFallbackProps {
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  loadingText?: string;
  errorTitle?: string;
  errorMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  showDismiss?: boolean;
  className?: string;
}

const LoadingErrorFallback: React.FC<LoadingErrorFallbackProps> = ({
  isLoading = false,
  error = null,
  onRetry,
  onDismiss,
  loadingText = 'Loading...',
  errorTitle = 'Loading Failed',
  errorMessage = 'Something went wrong while loading the content.',
  size = 'md',
  showDismiss = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'h-4 w-4',
      title: 'text-sm',
      text: 'text-xs',
      button: 'text-xs'
    },
    md: {
      container: 'p-4',
      icon: 'h-5 w-5',
      title: 'text-sm',
      text: 'text-sm',
      button: 'text-sm'
    },
    lg: {
      container: 'p-6',
      icon: 'h-6 w-6',
      title: 'text-base',
      text: 'text-sm',
      button: 'text-sm'
    }
  };

  const classes = sizeClasses[size];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${classes.container} ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className={`${classes.icon} animate-spin`} />
          <span className={classes.text}>{loadingText}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md ${classes.container} ${className}`}>
        <div className="flex items-start">
          <AlertCircle className={`${classes.icon} text-red-500 flex-shrink-0 mt-0.5`} />
          
          <div className="ml-3 flex-1">
            <h4 className={`${classes.title} font-medium text-red-800`}>
              {errorTitle}
            </h4>
            
            <p className={`${classes.text} text-red-700 mt-1`}>
              {errorMessage}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className={`${classes.button} cursor-pointer text-red-600`}>
                  Show Error Details
                </summary>
                <pre className={`${classes.button} mt-1 text-red-800 bg-red-100 p-2 rounded whitespace-pre-wrap`}>
                  {error.message}
                </pre>
              </details>
            )}

            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className={classes.button}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              
              {showDismiss && onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className={`${classes.button} text-red-600 hover:text-red-700`}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingErrorFallback;
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Logger from '../../utils/logger';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  level?: 'page' | 'section' | 'component';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

class ComponentErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName, level = 'component', onError } = this.props;
    
    Logger.error(`🔧 ${componentName || 'Component'} Error Boundary caught error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ComponentErrorBoundary',
      componentName,
      level,
      retryCount: this.retryCount,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * Math.pow(2, this.retryCount)); // Exponential backoff
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network-related errors
    const retryableErrors = [
      'network error',
      'fetch failed',
      'loading chunk',
      'loading css chunk',
      'loading failed'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(msg => errorMessage.includes(msg));
  }

  private handleRetry = () => {
    this.retryCount++;
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  private handleDismiss = () => {
    // For non-critical errors, allow dismissing the error
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  private renderFallbackUI() {
    const { level = 'component', componentName } = this.props;
    const canRetry = this.retryCount < this.maxRetries;
    const canDismiss = level === 'component' || level === 'section';

    // Compact error display for component-level errors
    if (level === 'component') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {componentName || 'Component'} Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                This component encountered an error and couldn't be displayed.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-red-600">
                    Show Error Details
                  </summary>
                  <pre className="text-xs mt-1 text-red-800 bg-red-100 p-2 rounded whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="flex items-center gap-2 mt-3">
                {canRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleRetry}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry {this.retryCount > 0 && `(${this.retryCount}/${this.maxRetries})`}
                  </Button>
                )}
                
                {canDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={this.handleDismiss}
                    className="text-xs text-red-600 hover:text-red-700"
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

    // Section-level error display
    if (level === 'section') {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Section Unavailable
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This section couldn't load due to an error.
            </p>
            
            <div className="flex justify-center gap-3">
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              
              {canDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleDismiss}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Page-level error display
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Page Error
          </h2>
          <p className="text-gray-600 mb-6">
            This page encountered an error and couldn't be displayed properly.
          </p>
          
          {canRetry && (
            <Button onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Logger from '../../utils/logger';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorBoundary: string;
  eventId?: string;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorBoundary: 'GlobalErrorBoundary'
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorBoundary: 'GlobalErrorBoundary'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details safely
    try {
      const errorDetails = {
        error: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace available',
        componentStack: errorInfo?.componentStack || 'No component stack available',
        errorBoundary: this.state.errorBoundary || 'Unknown boundary',
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      };
      
      Logger.error('🚨 Global Error Boundary caught error:', errorDetails);
    } catch (loggingError) {
      // Fallback logging if the above fails
      console.error('🚨 Global Error Boundary caught error (fallback logging):', {
        originalError: error,
        errorInfo,
        loggingError
      });
    }

    // Report to error monitoring service (you can integrate Sentry here)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would integrate with your error monitoring service
    // For example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  };

  private handleRefresh = () => {
    // Clear error state and refresh
    this.setState({
      hasError: false,
      error: null,
      errorBoundary: 'GlobalErrorBoundary'
    });
    
    // Optional: Reload the page
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    // Navigate to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-gray-600 mb-6">
              We apologize for the inconvenience. The application encountered an unexpected error.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 text-left">
                <details className="bg-gray-100 p-3 rounded text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Error Details (Development Mode)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1 bg-white p-2 rounded border overflow-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleRefresh}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
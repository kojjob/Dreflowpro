'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Logger from '../../utils/logger';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  onDataError?: (error: Error) => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'parsing' | 'validation' | 'unknown';
  retryCount: number;
}

class DataErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = DataErrorBoundary.categorizeError(error);
    
    return {
      hasError: true,
      error,
      errorType
    };
  }

  private static categorizeError(error: Error): 'network' | 'parsing' | 'validation' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('json') || message.includes('parse') || message.includes('syntax')) {
      return 'parsing';
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('📊 Data Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'DataErrorBoundary',
      errorType: this.state.errorType,
      retryCount: this.state.retryCount,
      timestamp: new Date().toISOString()
    });

    // Call custom error handler if provided
    if (this.props.onDataError) {
      this.props.onDataError(error);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorType: 'unknown',
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private getErrorMessage(): { title: string; description: string; actionText: string } {
    const { errorType } = this.state;
    const { fallbackMessage } = this.props;
    
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Error',
          description: fallbackMessage || 'Unable to load data due to a network problem. Please check your connection.',
          actionText: 'Retry'
        };
      
      case 'parsing':
        return {
          title: 'Data Format Error',
          description: fallbackMessage || 'The data received is in an unexpected format and cannot be displayed.',
          actionText: 'Reload'
        };
      
      case 'validation':
        return {
          title: 'Data Validation Error',
          description: fallbackMessage || 'The data received does not meet the expected requirements.',
          actionText: 'Refresh'
        };
      
      default:
        return {
          title: 'Data Loading Error',
          description: fallbackMessage || 'An error occurred while loading data. Please try again.',
          actionText: 'Retry'
        };
    }
  }

  private canRetry(): boolean {
    return this.state.retryCount < this.maxRetries && 
           (this.state.errorType === 'network' || this.state.errorType === 'unknown');
  }

  render() {
    if (this.state.hasError) {
      const { title, description, actionText } = this.getErrorMessage();
      const canRetry = this.canRetry();

      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {this.state.errorType === 'network' ? (
                <Database className="h-6 w-6 text-yellow-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {title}
              </h3>
              
              <p className="text-sm text-yellow-700 mt-1">
                {description}
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-3">
                  <summary className="text-xs cursor-pointer text-yellow-600">
                    Technical Details (Development)
                  </summary>
                  <pre className="text-xs mt-2 text-yellow-800 bg-yellow-100 p-2 rounded whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="mt-4">
                {canRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleRetry}
                    className="mr-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {actionText}
                    {this.state.retryCount > 0 && ` (${this.state.retryCount}/${this.maxRetries})`}
                  </Button>
                )}

                <span className="text-xs text-yellow-600">
                  {!canRetry && this.state.retryCount >= this.maxRetries && 
                    'Maximum retry attempts reached. Please refresh the page.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DataErrorBoundary;
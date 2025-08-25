'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, HelpCircle, Wifi, Database } from 'lucide-react';
import { Button } from './Button';

export interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  type?: 'network' | 'auth' | 'data' | 'component' | 'page' | 'generic';
  title?: string;
  message?: string;
  showRetry?: boolean;
  showHome?: boolean;
  showSupport?: boolean;
  className?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  type = 'generic',
  title,
  message,
  showRetry = true,
  showHome = false,
  showSupport = false,
  className = ''
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: Wifi,
          title: title || 'Connection Problem',
          message: message || 'Unable to connect to the server. Please check your internet connection.',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      
      case 'auth':
        return {
          icon: AlertTriangle,
          title: title || 'Authentication Required',
          message: message || 'You need to sign in to access this content.',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      
      case 'data':
        return {
          icon: Database,
          title: title || 'Data Loading Error',
          message: message || 'There was a problem loading the data. Please try again.',
          color: 'text-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      
      case 'component':
        return {
          icon: AlertTriangle,
          title: title || 'Component Error',
          message: message || 'This component encountered an error and cannot be displayed.',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      
      case 'page':
        return {
          icon: AlertTriangle,
          title: title || 'Page Error',
          message: message || 'This page encountered an error and cannot be displayed properly.',
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      
      default:
        return {
          icon: AlertTriangle,
          title: title || 'Something went wrong',
          message: message || 'An unexpected error occurred. Please try again.',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  const handleHome = () => {
    window.location.href = '/';
  };

  const handleSupport = () => {
    window.location.href = '/contact';
  };

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {config.title}
          </h3>
          
          <p className="text-sm text-gray-700 mt-1">
            {config.message}
          </p>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-3">
              <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                Error Details (Development Mode)
              </summary>
              <div className="mt-2 text-xs text-gray-800 bg-white p-2 rounded border">
                <div className="font-medium">Message:</div>
                <div className="mb-2">{error.message}</div>
                {error.stack && (
                  <>
                    <div className="font-medium">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}

          <div className="flex items-center gap-3 mt-4">
            {showRetry && resetError && (
              <Button
                size="sm"
                onClick={resetError}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {showHome && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            )}
            
            {showSupport && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSupport}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Get Help
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
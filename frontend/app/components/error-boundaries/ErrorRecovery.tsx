'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Logger from '../../utils/logger';

interface ErrorRecoveryProps {
  error: Error;
  resetError: () => void;
  componentName?: string;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  resetError,
  componentName = 'Component',
  level = 'component',
  showDetails = process.env.NODE_ENV === 'development'
}) => {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetrying, setAutoRetrying] = useState(false);
  
  const maxRetries = 3;
  const retryDelay = [1000, 2000, 4000]; // Progressive delays
  
  useEffect(() => {
    // Log error for monitoring
    Logger.error(`Error in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      level,
      retryCount
    });
  }, [error, componentName, level, retryCount]);
  
  const handleRetry = async () => {
    if (retryCount < maxRetries) {
      setAutoRetrying(true);
      setRetryCount(prev => prev + 1);
      
      // Progressive delay before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay[retryCount]));
      
      setAutoRetrying(false);
      resetError();
    }
  };
  
  const handleGoHome = () => {
    router.push('/');
  };
  
  const getErrorMessage = () => {
    // User-friendly error messages
    if (error.message.includes('Network')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (error.message.includes('Permission') || error.message.includes('Unauthorized')) {
      return 'You don\'t have permission to access this resource.';
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'The requested resource could not be found.';
    }
    if (error.message.includes('500') || error.message.includes('Server')) {
      return 'Server error. Our team has been notified.';
    }
    
    // Default message
    return level === 'page' 
      ? 'Something went wrong loading this page.'
      : 'An unexpected error occurred.';
  };
  
  const getSuggestions = () => {
    const suggestions = [];
    
    if (error.message.includes('Network')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
    }
    
    if (error.message.includes('Permission')) {
      suggestions.push('Make sure you\'re logged in');
      suggestions.push('Check if you have the required permissions');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  };
  
  // Different layouts based on error level
  if (level === 'page') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {getErrorMessage()}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRetry}
                  disabled={autoRetrying || retryCount >= maxRetries}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${autoRetrying ? 'animate-spin' : ''}`} />
                  {autoRetrying ? 'Retrying...' : 'Try Again'}
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
              
              {retryCount >= maxRetries && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                  Maximum retry attempts reached. Please contact support if the issue persists.
                </p>
              )}
              
              {showDetails && (
                <div className="mt-6 w-full">
                  <button
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mx-auto"
                  >
                    {detailsOpen ? 'Hide' : 'Show'} Technical Details
                    {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {detailsOpen && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                        {error.message}
                      </p>
                      {error.stack && (
                        <pre className="mt-2 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
                          {error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Suggestions:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {getSuggestions().map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // Component-level error
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-200">
            Error loading {componentName}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {getErrorMessage()}
          </p>
          
          <button
            onClick={handleRetry}
            disabled={autoRetrying || retryCount >= maxRetries}
            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {autoRetrying ? 'Retrying...' : `Try again ${retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}`}
          </button>
        </div>
      </div>
      
      {showDetails && error.stack && (
        <details className="mt-3">
          <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
            Technical details
          </summary>
          <pre className="mt-2 text-xs text-red-500 dark:text-red-400 overflow-x-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorRecovery;
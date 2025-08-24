/**
 * Comprehensive Error Handling System
 * Provides centralized error management with logging, user feedback, and recovery
 */

import { Logger } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  API = 'API',
  SYSTEM = 'SYSTEM',
  USER_INPUT = 'USER_INPUT',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage?: string;
  code?: string | number;
  details?: any;
  timestamp: string;
  stack?: string;
  context?: Record<string, any>;
  recoverable?: boolean;
  retryable?: boolean;
}

export interface ErrorRecoveryOption {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: AppError) => void)[] = [];
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create and handle an application error
   */
  handleError(
    error: Error | any,
    type: ErrorType = ErrorType.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    userMessage?: string
  ): AppError {
    const appError: AppError = {
      id: this.generateErrorId(),
      type,
      severity,
      message: error?.message || String(error),
      userMessage: userMessage || this.getDefaultUserMessage(type),
      code: error?.code || error?.status,
      details: error?.details || error?.response?.data,
      timestamp: new Date().toISOString(),
      stack: error?.stack,
      context,
      recoverable: this.isRecoverable(type),
      retryable: this.isRetryable(type)
    };

    // Log error based on severity
    this.logError(appError);

    // Add to history
    this.addToHistory(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Auto-report critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.reportError(appError);
    }

    return appError;
  }

  /**
   * Handle API response errors
   */
  handleApiError(response: Response, context?: Record<string, any>): AppError {
    let type = ErrorType.API;
    let severity = ErrorSeverity.MEDIUM;
    let userMessage = 'An error occurred while processing your request.';

    switch (response.status) {
      case 400:
        type = ErrorType.VALIDATION;
        userMessage = 'Please check your input and try again.';
        break;
      case 401:
        type = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        userMessage = 'Please log in to continue.';
        break;
      case 403:
        type = ErrorType.AUTHORIZATION;
        severity = ErrorSeverity.HIGH;
        userMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        type = ErrorType.NOT_FOUND;
        userMessage = 'The requested resource was not found.';
        break;
      case 429:
        type = ErrorType.RATE_LIMIT;
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        severity = ErrorSeverity.HIGH;
        userMessage = 'Server error. Please try again later.';
        break;
    }

    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    (error as any).response = response;

    return this.handleError(error, type, severity, {
      ...context,
      url: response.url,
      status: response.status
    }, userMessage);
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error, context?: Record<string, any>): AppError {
    const severity = navigator.onLine ? ErrorSeverity.HIGH : ErrorSeverity.CRITICAL;
    const userMessage = navigator.onLine 
      ? 'Network error. Please check your connection and try again.'
      : 'You appear to be offline. Please check your internet connection.';

    return this.handleError(error, ErrorType.NETWORK, severity, context, userMessage);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    errors: Record<string, string[]> | string,
    context?: Record<string, any>
  ): AppError {
    const message = typeof errors === 'string' 
      ? errors 
      : Object.entries(errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');

    const error = new Error(message);
    (error as any).details = errors;

    return this.handleError(
      error,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      context,
      'Please correct the highlighted fields and try again.'
    );
  }

  /**
   * Handle timeout errors
   */
  handleTimeoutError(timeout: number, context?: Record<string, any>): AppError {
    const error = new Error(`Request timeout after ${timeout}ms`);
    return this.handleError(
      error,
      ErrorType.TIMEOUT,
      ErrorSeverity.MEDIUM,
      context,
      'The request took too long. Please try again.'
    );
  }

  /**
   * Subscribe to error notifications
   */
  subscribe(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error recovery options
   */
  getRecoveryOptions(error: AppError): ErrorRecoveryOption[] {
    const options: ErrorRecoveryOption[] = [];

    switch (error.type) {
      case ErrorType.NETWORK:
        options.push({
          label: 'Retry',
          action: () => window.location.reload(),
          primary: true
        });
        break;

      case ErrorType.AUTHENTICATION:
        options.push({
          label: 'Login',
          action: () => window.location.href = '/login',
          primary: true
        });
        break;

      case ErrorType.TIMEOUT:
      case ErrorType.RATE_LIMIT:
        if (error.retryable) {
          options.push({
            label: 'Try Again',
            action: () => window.location.reload(),
            primary: true
          });
        }
        break;

      case ErrorType.NOT_FOUND:
        options.push({
          label: 'Go Home',
          action: () => window.location.href = '/',
          primary: true
        });
        break;
    }

    // Always add generic options
    options.push({
      label: 'Refresh Page',
      action: () => window.location.reload()
    });

    return options;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Network connection error. Please check your internet and try again.';
      case ErrorType.AUTHENTICATION:
        return 'Authentication required. Please log in to continue.';
      case ErrorType.AUTHORIZATION:
        return 'Access denied. You do not have permission for this action.';
      case ErrorType.VALIDATION:
        return 'Please check your input and correct any errors.';
      case ErrorType.TIMEOUT:
        return 'Request timed out. Please try again.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait and try again.';
      case ErrorType.NOT_FOUND:
        return 'The requested item could not be found.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private isRecoverable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.VALIDATION
    ].includes(type);
  }

  private isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.API
    ].includes(type);
  }

  private logError(error: AppError): void {
    const logData = {
      id: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      code: error.code,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        Logger.error('🚨 CRITICAL ERROR:', logData);
        Logger.error('Error Stack:', error.stack);
        break;
      case ErrorSeverity.HIGH:
        Logger.error('❌ High Severity Error:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        Logger.warn('⚠️ Medium Severity Error:', logData);
        break;
      case ErrorSeverity.LOW:
        Logger.log('ℹ️ Low Severity Error:', logData);
        break;
    }
  }

  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        Logger.error('Error in error listener:', e);
      }
    });
  }

  private async reportError(error: AppError): Promise<void> {
    try {
      // In production, this would send to error reporting service
      Logger.error('🚨 CRITICAL ERROR - Auto-reporting:', {
        id: error.id,
        type: error.type,
        message: error.message,
        stack: error.stack,
        context: error.context,
        timestamp: error.timestamp,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    } catch (e) {
      Logger.error('Failed to report error:', e);
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export utility functions
export const handleError = (
  error: Error | any,
  type?: ErrorType,
  severity?: ErrorSeverity,
  context?: Record<string, any>,
  userMessage?: string
) => errorHandler.handleError(error, type, severity, context, userMessage);

export const handleApiError = (response: Response, context?: Record<string, any>) =>
  errorHandler.handleApiError(response, context);

export const handleNetworkError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleNetworkError(error, context);

export const handleValidationError = (
  errors: Record<string, string[]> | string,
  context?: Record<string, any>
) => errorHandler.handleValidationError(errors, context);

export const handleTimeoutError = (timeout: number, context?: Record<string, any>) =>
  errorHandler.handleTimeoutError(timeout, context);
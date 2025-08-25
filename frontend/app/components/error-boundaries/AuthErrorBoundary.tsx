'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Logger from '../../utils/logger';
import { Shield, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  onAuthError?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorBoundary: string;
  isAuthError: boolean;
}

class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorBoundary: 'AuthErrorBoundary',
      isAuthError: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const isAuthError = AuthErrorBoundary.isAuthenticationError(error);
    
    return {
      hasError: true,
      error,
      errorBoundary: 'AuthErrorBoundary',
      isAuthError
    };
  }

  private static isAuthenticationError(error: Error): boolean {
    // Check if error is authentication-related
    const authErrorMessages = [
      'authentication failed',
      'invalid token',
      'token expired',
      'unauthorized',
      'session expired',
      'login required',
      'access denied'
    ];

    const errorMessage = error.message.toLowerCase();
    return authErrorMessages.some(msg => errorMessage.includes(msg));
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('🔐 Auth Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.state.errorBoundary,
      isAuthError: this.state.isAuthError,
      timestamp: new Date().toISOString()
    });

    // Call auth error handler if provided
    if (this.state.isAuthError && this.props.onAuthError) {
      this.props.onAuthError();
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorBoundary: 'AuthErrorBoundary',
      isAuthError: false
    });
  };

  private handleLogin = () => {
    // Navigate to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  render() {
    if (this.state.hasError && this.state.isAuthError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-sm w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-500" />
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Authentication Required
            </h2>
            
            <p className="text-gray-600 mb-6">
              Your session has expired or authentication is required to access this content.
            </p>

            <div className="space-y-3">
              <Button
                onClick={this.handleLogin}
                className="w-full flex items-center justify-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // For non-auth errors, let them bubble up to parent error boundary
    if (this.state.hasError && !this.state.isAuthError) {
      // Ensure we have a valid error object before re-throwing
      const errorToThrow = this.state.error || new Error('Unknown error occurred in AuthErrorBoundary');
      throw errorToThrow;
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
'use client';

import React from 'react';

export { default as GlobalErrorBoundary } from './GlobalErrorBoundary';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { default as ComponentErrorBoundary } from './ComponentErrorBoundary';
export { default as DataErrorBoundary } from './DataErrorBoundary';

// Higher-order components for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: {
    fallback?: React.ReactNode;
    componentName?: string;
    level?: 'page' | 'section' | 'component';
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }
) {
  const WrappedComponent = (props: P) => {
    const ComponentErrorBoundary = require('./ComponentErrorBoundary').default;
    
    return (
      <ComponentErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ComponentErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// HOC for data components
export function withDataErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: {
    onDataError?: (error: Error) => void;
    fallbackMessage?: string;
  }
) {
  const WrappedComponent = (props: P) => {
    const DataErrorBoundary = require('./DataErrorBoundary').default;
    
    return (
      <DataErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </DataErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withDataErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// HOC for auth-related components
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: {
    onAuthError?: () => void;
  }
) {
  const WrappedComponent = (props: P) => {
    const AuthErrorBoundary = require('./AuthErrorBoundary').default;
    
    return (
      <AuthErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
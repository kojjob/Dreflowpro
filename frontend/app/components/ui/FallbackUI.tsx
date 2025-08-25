'use client';

import React from 'react';
import ErrorFallback, { ErrorFallbackProps } from './ErrorFallback';
import LoadingErrorFallback, { LoadingErrorFallbackProps } from './LoadingErrorFallback';
import EmptyState, { EmptyStateProps } from './EmptyState';
import OfflineIndicator from './OfflineIndicator';

// Main FallbackUI component that can handle different states
interface FallbackUIProps {
  state: 'loading' | 'error' | 'empty' | 'offline' | 'success';
  loading?: {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
  };
  error?: {
    error?: Error;
    title?: string;
    message?: string;
    onRetry?: () => void;
    showRetry?: boolean;
    showHome?: boolean;
    showSupport?: boolean;
    type?: 'network' | 'auth' | 'data' | 'component' | 'page' | 'generic';
  };
  empty?: EmptyStateProps;
  children?: React.ReactNode;
  className?: string;
}

const FallbackUI: React.FC<FallbackUIProps> = ({
  state,
  loading,
  error,
  empty,
  children,
  className = ''
}) => {
  switch (state) {
    case 'loading':
      return (
        <LoadingErrorFallback
          isLoading={true}
          loadingText={loading?.text}
          size={loading?.size}
          className={className}
        />
      );

    case 'error':
      return (
        <ErrorFallback
          error={error?.error}
          title={error?.title}
          message={error?.message}
          resetError={error?.onRetry}
          showRetry={error?.showRetry}
          showHome={error?.showHome}
          showSupport={error?.showSupport}
          type={error?.type}
          className={className}
        />
      );

    case 'empty':
      if (!empty) return null;
      return <EmptyState {...empty} className={className} />;

    case 'offline':
      return <OfflineIndicator className={className} />;

    case 'success':
    default:
      return <>{children}</>;
  }
};

// Convenience components for specific use cases
export const LoadingFallback: React.FC<{ text?: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ text, size, className }) => (
  <FallbackUI state="loading" loading={{ text, size }} className={className} />
);

export const ErrorStateFallback: React.FC<ErrorFallbackProps & { className?: string }> = (props) => (
  <FallbackUI state="error" error={props} className={props.className} />
);

export const EmptyStateFallback: React.FC<EmptyStateProps & { className?: string }> = (props) => (
  <FallbackUI state="empty" empty={props} className={props.className} />
);

export const OfflineFallback: React.FC<{ className?: string }> = ({ className }) => (
  <FallbackUI state="offline" className={className} />
);

// Hook for managing fallback states
export const useFallbackState = (initialState: 'loading' | 'error' | 'empty' | 'offline' | 'success' = 'loading') => {
  const [state, setState] = React.useState<'loading' | 'error' | 'empty' | 'offline' | 'success'>(initialState);
  const [error, setError] = React.useState<Error | null>(null);

  const setLoading = () => {
    setState('loading');
    setError(null);
  };

  const setErrorState = (error: Error) => {
    setState('error');
    setError(error);
  };

  const setEmpty = () => {
    setState('empty');
    setError(null);
  };

  const setSuccess = () => {
    setState('success');
    setError(null);
  };

  const setOffline = () => {
    setState('offline');
    setError(null);
  };

  const reset = () => {
    setState('loading');
    setError(null);
  };

  return {
    state,
    error,
    setLoading,
    setError: setErrorState,
    setEmpty,
    setSuccess,
    setOffline,
    reset,
    isLoading: state === 'loading',
    isError: state === 'error',
    isEmpty: state === 'empty',
    isOffline: state === 'offline',
    isSuccess: state === 'success'
  };
};

export default FallbackUI;
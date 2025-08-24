'use client';

import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface ComponentLoaderProps {
  height?: string;
  className?: string;
  showSpinner?: boolean;
  message?: string;
}

const ComponentLoader: React.FC<ComponentLoaderProps> = memo(({
  height = 'h-96',
  className = '',
  showSpinner = true,
  message = 'Loading...'
}) => {
  return (
    <div className={`
      animate-pulse bg-gradient-to-r from-gray-100 to-gray-200 
      ${height} rounded-lg flex items-center justify-center
      ${className}
    `}>
      {showSpinner && (
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600 font-medium">{message}</span>
        </div>
      )}
    </div>
  );
});

ComponentLoader.displayName = 'ComponentLoader';

export default ComponentLoader;

// Specific loaders for different component types
export const DashboardLoader = memo(() => (
  <ComponentLoader height="h-64" message="Loading dashboard..." />
));

export const FormLoader = memo(() => (
  <ComponentLoader height="h-96" message="Loading form..." />
));

export const ChartLoader = memo(() => (
  <ComponentLoader height="h-80" message="Loading charts..." />
));

export const TableLoader = memo(() => (
  <ComponentLoader height="h-64" message="Loading data..." />
));

export const ModalLoader = memo(() => (
  <ComponentLoader height="h-48" message="Loading content..." />
));

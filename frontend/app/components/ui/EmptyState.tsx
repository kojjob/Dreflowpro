'use client';

import React from 'react';
import { Plus, Search, Database, FileX, Users, Settings } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: 'plus' | 'search' | 'database' | 'file' | 'users' | 'settings' | React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'database',
  title,
  description,
  action,
  secondaryAction,
  className = ''
}) => {
  const getIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    const iconClasses = "h-12 w-12 text-gray-400";
    
    switch (icon) {
      case 'plus':
        return <Plus className={iconClasses} />;
      case 'search':
        return <Search className={iconClasses} />;
      case 'database':
        return <Database className={iconClasses} />;
      case 'file':
        return <FileX className={iconClasses} />;
      case 'users':
        return <Users className={iconClasses} />;
      case 'settings':
        return <Settings className={iconClasses} />;
      default:
        return <Database className={iconClasses} />;
    }
  };

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="flex justify-center mb-4">
        {getIcon()}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        {description}
      </p>

      <div className="flex items-center justify-center gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant}
          >
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="ghost"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
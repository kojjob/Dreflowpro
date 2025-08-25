'use client';

import React from 'react';

// DreflowPro Design System Configuration
export const DreflowDesignSystem = {
  // Color Palette
  colors: {
    // Brand Colors (Teal-based)
    brand: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Primary brand color
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    
    // Secondary Colors (Slate-based)
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b', // Main dark background
      900: '#0f172a',
    },
    
    // Chart Colors
    chart: {
      primary: 'rgba(20, 184, 166, 0.8)',     // brand-500
      secondary: 'rgba(59, 130, 246, 0.8)',   // blue-500
      success: 'rgba(16, 185, 129, 0.8)',     // green-500
      warning: 'rgba(245, 158, 11, 0.8)',     // yellow-500
      danger: 'rgba(239, 68, 68, 0.8)',       // red-500
      purple: 'rgba(139, 92, 246, 0.8)',      // purple-500
      pink: 'rgba(236, 72, 153, 0.8)',        // pink-500
      indigo: 'rgba(99, 102, 241, 0.8)',      // indigo-500
    }
  },

  // Gradient Backgrounds
  gradients: {
    // Main background gradient
    main: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    
    // Card backgrounds
    card: 'bg-white/80 backdrop-blur-sm',
    cardHover: 'hover:bg-white/90',
    
    // Header gradients
    headerPrimary: 'bg-gradient-to-r from-brand-500 to-blue-500',
    headerSecondary: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    
    // Button gradients
    buttonPrimary: 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700',
    buttonSecondary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    
    // Text gradients
    textPrimary: 'bg-gradient-to-r from-gray-900 to-brand-600 bg-clip-text text-transparent',
    textSecondary: 'bg-gradient-to-r from-gray-700 to-blue-600 bg-clip-text text-transparent',
    
    // Icon backgrounds
    iconPrimary: 'bg-gradient-to-r from-brand-100 to-brand-200',
    iconSecondary: 'bg-gradient-to-r from-blue-100 to-blue-200',
    iconSuccess: 'bg-gradient-to-r from-green-100 to-green-200',
    iconWarning: 'bg-gradient-to-r from-yellow-100 to-yellow-200',
    iconDanger: 'bg-gradient-to-r from-red-100 to-red-200',
    iconPurple: 'bg-gradient-to-r from-purple-100 to-purple-200',
  },

  // Shadow System
  shadows: {
    card: 'shadow-xl',
    cardHover: 'hover:shadow-2xl',
    modal: 'shadow-2xl',
    button: 'shadow-lg hover:shadow-xl',
    dropdown: 'shadow-xl',
  },

  // Border System
  borders: {
    card: 'border border-white/20',
    input: 'border border-gray-300',
    focus: 'focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
    divider: 'border-b border-gray-100',
  },

  // Backdrop Blur Effects
  blur: {
    card: 'backdrop-blur-sm',
    modal: 'backdrop-blur-md',
    overlay: 'backdrop-blur-lg',
  },

  // Border Radius
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },

  // Typography
  typography: {
    heading1: 'text-3xl font-bold',
    heading2: 'text-2xl font-bold',
    heading3: 'text-xl font-semibold',
    heading4: 'text-lg font-semibold',
    body: 'text-base',
    bodySmall: 'text-sm',
    caption: 'text-xs',
    
    // Font weights
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },

  // Spacing
  spacing: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  },

  // Animation & Transitions
  animations: {
    transition: 'transition-all duration-300',
    transitionFast: 'transition-all duration-200',
    transitionSlow: 'transition-all duration-500',
    hover: 'hover:scale-105',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
  }
};

// Component Style Presets
export const ComponentStyles = {
  // Modal styles
  modal: {
    overlay: `fixed inset-0 bg-black/50 ${DreflowDesignSystem.blur.overlay} flex items-center justify-center z-50`,
    container: `${DreflowDesignSystem.gradients.main} ${DreflowDesignSystem.radius.lg} ${DreflowDesignSystem.shadows.modal} max-w-7xl mx-4 max-h-[95vh] overflow-hidden`,
    header: `${DreflowDesignSystem.gradients.card} ${DreflowDesignSystem.blur.card} ${DreflowDesignSystem.borders.divider} px-6 py-4`,
    content: 'flex-1 overflow-y-auto p-6',
  },

  // Card styles
  card: {
    base: `${DreflowDesignSystem.gradients.card} ${DreflowDesignSystem.blur.card} ${DreflowDesignSystem.radius.lg} ${DreflowDesignSystem.shadows.card} ${DreflowDesignSystem.borders.card} ${DreflowDesignSystem.animations.transition} ${DreflowDesignSystem.shadows.cardHover}`,
    header: `${DreflowDesignSystem.borders.divider} px-6 py-4`,
    content: `${DreflowDesignSystem.spacing.md}`,
  },

  // Button styles
  button: {
    primary: `${DreflowDesignSystem.gradients.buttonPrimary} text-white ${DreflowDesignSystem.radius.sm} px-4 py-2 ${DreflowDesignSystem.shadows.button} ${DreflowDesignSystem.animations.transition}`,
    secondary: `${DreflowDesignSystem.gradients.buttonSecondary} text-white ${DreflowDesignSystem.radius.sm} px-4 py-2 ${DreflowDesignSystem.shadows.button} ${DreflowDesignSystem.animations.transition}`,
    ghost: `text-gray-700 hover:bg-gray-100 ${DreflowDesignSystem.radius.sm} px-4 py-2 ${DreflowDesignSystem.animations.transition}`,
  },

  // Input styles
  input: {
    base: `w-full ${DreflowDesignSystem.borders.input} ${DreflowDesignSystem.borders.focus} ${DreflowDesignSystem.radius.sm} px-3 py-2 ${DreflowDesignSystem.animations.transition}`,
  },

  // Badge styles
  badge: {
    primary: `${DreflowDesignSystem.gradients.iconPrimary} text-brand-800 px-2 py-1 ${DreflowDesignSystem.radius.full} text-xs font-medium`,
    secondary: `${DreflowDesignSystem.gradients.iconSecondary} text-blue-800 px-2 py-1 ${DreflowDesignSystem.radius.full} text-xs font-medium`,
    success: `${DreflowDesignSystem.gradients.iconSuccess} text-green-800 px-2 py-1 ${DreflowDesignSystem.radius.full} text-xs font-medium`,
    warning: `${DreflowDesignSystem.gradients.iconWarning} text-yellow-800 px-2 py-1 ${DreflowDesignSystem.radius.full} text-xs font-medium`,
    danger: `${DreflowDesignSystem.gradients.iconDanger} text-red-800 px-2 py-1 ${DreflowDesignSystem.radius.full} text-xs font-medium`,
  },

  // Navigation styles
  nav: {
    tab: `flex items-center space-x-2 py-4 border-b-2 ${DreflowDesignSystem.animations.transition}`,
    tabActive: 'border-brand-500 text-brand-600',
    tabInactive: 'border-transparent text-gray-600 hover:text-gray-900',
  },

  // Chart container styles
  chart: {
    container: `${ComponentStyles.card.base} overflow-hidden`,
    header: `${ComponentStyles.card.header}`,
    content: `${ComponentStyles.card.content}`,
  }
};

// Utility functions for dynamic styling
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'excellent':
    case 'good':
    case 'success':
      return 'text-green-600';
    case 'fair':
    case 'warning':
      return 'text-yellow-600';
    case 'poor':
    case 'error':
    case 'danger':
      return 'text-red-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

export const getStatusBackground = (status: string) => {
  switch (status.toLowerCase()) {
    case 'excellent':
    case 'good':
    case 'success':
      return DreflowDesignSystem.gradients.iconSuccess;
    case 'fair':
    case 'warning':
      return DreflowDesignSystem.gradients.iconWarning;
    case 'poor':
    case 'error':
    case 'danger':
      return DreflowDesignSystem.gradients.iconDanger;
    case 'info':
      return DreflowDesignSystem.gradients.iconSecondary;
    default:
      return DreflowDesignSystem.gradients.iconPrimary;
  }
};

export const getChartColor = (index: number) => {
  const colors = Object.values(DreflowDesignSystem.colors.chart);
  return colors[index % colors.length];
};

// React component for applying design system styles
interface DesignSystemProviderProps {
  children: React.ReactNode;
  className?: string;
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`${DreflowDesignSystem.gradients.main} min-h-screen ${className}`}>
      {children}
    </div>
  );
};

export default {
  DreflowDesignSystem,
  ComponentStyles,
  getStatusColor,
  getStatusBackground,
  getChartColor,
  DesignSystemProvider
};

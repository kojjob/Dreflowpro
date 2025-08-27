'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Logger from '../../utils/logger';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { apiService } from '../../services/api';

import UserProfileDropdown from '../ui/UserProfileDropdown';
import NotificationsDropdown from '../ui/NotificationsDropdown';
import {
  Database,
  Menu,
  X,
  Home,
  Zap,
  Brain,
  Clock,
  Sparkles,
  CheckSquare,
  ArrowRight,
  Target,
  User,
  Settings,
  CreditCard,
  HelpCircle
} from 'lucide-react';

// Lazy load heavy components for better performance
const DashboardStats = dynamic(() => import('./DashboardStatsOptimized'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
  ssr: false
});

const ProfileSettings = dynamic(() => import('../profile/ProfileSettings'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const Preferences = dynamic(() => import('../profile/Preferences'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const BillingSubscription = dynamic(() => import('../profile/BillingSubscription'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const HelpSupport = dynamic(() => import('../profile/HelpSupport'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const DataAnalysisWorkflow = dynamic(() => import('../data-analysis/DataAnalysisWorkflow'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const PipelineManager = dynamic(() => import('../pipelines/PipelineManagerOptimized'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const TaskMonitor = dynamic(() => import('../tasks/TaskMonitor'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const ConnectorManager = dynamic(() => import('../connectors/ConnectorManager'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const ReportsManager = dynamic(() => import('../reports/ReportsManager'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

const AIInsightsManager = dynamic(() => import('../ai/AIInsightsManager'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
});

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType;
  description: string;
}

const MainDashboard: React.FC = () => {
  // Performance monitoring
  usePerformanceMonitor({
    componentName: 'MainDashboard',
    threshold: 100
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardConfig, setDashboardConfig] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize valid tabs for performance
  const validTabs = useMemo(() => [
    'overview', 'pipelines', 'connectors', 'data-analysis',
    'tasks', 'ai-insights', 'profile', 'preferences', 'billing', 'help'
  ], []);

  // Load dynamic dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle URL parameters for direct navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    Logger.log('📍 URL tab parameter:', tab);
    if (tab && validTabs.includes(tab)) {
      Logger.log('✅ Setting active view to:', tab);
      setActiveView(tab);
    } else if (tab) {
      Logger.log('❌ Invalid tab:', tab);
    }
  }, [searchParams, validTabs]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated before trying to load dashboard data
      if (!user) {
        Logger.log('User not authenticated, skipping dashboard data load');
        setLoading(false);
        return;
      }

      // Load all dashboard data in parallel, but handle failures gracefully
      const results = await Promise.allSettled([
        apiService.getDashboardConfig(),
        apiService.getDashboardStats(),
        apiService.getSystemStatus()
      ]);

      // Handle config response
      if (results[0].status === 'fulfilled' && results[0].value.success) {
        setDashboardConfig(results[0].value.data);
      } else if (results[0].status === 'rejected') {
        Logger.warn('Failed to load dashboard config:', results[0].reason);
      }

      // Handle stats response
      if (results[1].status === 'fulfilled' && results[1].value.success) {
        setDashboardStats(results[1].value.data);
      } else if (results[1].status === 'rejected') {
        Logger.warn('Failed to load dashboard stats:', results[1].reason);
      }

      // Handle status response
      if (results[2].status === 'fulfilled' && results[2].value.success) {
        setSystemStatus(results[2].value.data);
      } else if (results[2].status === 'rejected') {
        Logger.warn('Failed to load system status:', results[2].reason);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      Logger.error('Failed to load dashboard data:', err);
      // Don't show error for API unavailability, just log it
      if (!errorMessage.includes('API is not available')) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Update time every minute for live dashboard feel - optimized
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Navigation is handled inline in the component for better performance

  // Dynamic navigation items from configuration
  const navigationItems: NavigationItem[] = useMemo(() => {
    // Default navigation structure
    const defaultItems = [
      {
        id: 'overview',
        name: 'Overview',
        icon: Home,
        component: DashboardStats,
        description: 'System health and key metrics'
      },
      {
        id: 'pipelines',
        name: 'Pipelines',
        icon: Zap,
        component: PipelineManager,
        description: 'ETL pipeline management and execution'
      },
      {
        id: 'connectors',
        name: 'Connectors',
        icon: Database,
        component: ConnectorManager,
        description: 'Data source connections and configuration'
      },
      {
        id: 'data-analysis',
        name: 'Data Analysis',
        icon: Brain,
        component: DataAnalysisWorkflow,
        description: 'Upload, analyze, and visualize data with AI insights'
      },
      {
        id: 'tasks',
        name: 'Tasks',
        icon: CheckSquare,
        component: TaskMonitor,
        description: 'Background task monitoring and management'
      },
      {
        id: 'reports',
        name: 'Reports',
        icon: Sparkles,
        component: ReportsManager,
        description: 'Generate and view analytical reports'
      },
      {
        id: 'ai-insights',
        name: 'AI Insights',
        icon: Brain,
        component: AIInsightsManager,
        description: 'AI-powered data insights and recommendations'
      },
      {
        id: 'profile',
        name: 'Profile Settings',
        icon: User,
        component: ProfileSettings,
        description: 'Manage your account information and security settings'
      },
      {
        id: 'preferences',
        name: 'Preferences',
        icon: Settings,
        component: Preferences,
        description: 'Customize your DreflowPro experience'
      },
      {
        id: 'billing',
        name: 'Billing & Subscription',
        icon: CreditCard,
        component: BillingSubscription,
        description: 'Manage your subscription and billing information'
      },
      {
        id: 'help',
        name: 'Help & Support',
        icon: HelpCircle,
        component: HelpSupport,
        description: 'Get help, find answers, and connect with our support team'
      }
    ];

    // Override with dynamic config if available
    if (dashboardConfig?.navigation) {
      return defaultItems.map(item => {
        const configItem = dashboardConfig.navigation.find((navItem: any) => navItem.id === item.id);
        if (configItem) {
          return {
            ...item,
            name: configItem.name || item.name,
            description: configItem.description || item.description
          };
        }
        return item;
      });
    }

    return defaultItems;
  }, [dashboardConfig]);

  const currentItem = navigationItems.find(item => item.id === activeView) || navigationItems[0];
  const CurrentComponent = currentItem.component;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Sidebar with Gradient */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-white to-gray-50 shadow-2xl transition-all duration-500 ease-in-out border-r border-gray-200/50 min-h-screen sticky top-0`}>
        {/* Header with Brand */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className={`${!sidebarOpen && 'hidden'} flex items-center space-x-3`}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white">
                {dashboardConfig?.branding?.app_name || 'DreflowPro'}
              </h1>
              <p className="text-blue-100 text-xs">
                {dashboardConfig?.branding?.tagline || 'Data Analytics Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all duration-200 text-white"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Live Status Bar */}
        <div className={`${!sidebarOpen && 'hidden'} px-6 py-4 ${
          systemStatus?.status === 'healthy' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
            : systemStatus?.status === 'degraded'
            ? 'bg-gradient-to-r from-yellow-50 to-orange-50'
            : 'bg-gradient-to-r from-red-50 to-pink-50'
        } border-b border-gray-200/50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemStatus?.status === 'healthy' 
                  ? 'bg-green-500' 
                  : systemStatus?.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                systemStatus?.status === 'healthy' 
                  ? 'text-green-700' 
                  : systemStatus?.status === 'degraded'
                  ? 'text-yellow-700'
                  : 'text-red-700'
              }`}>
                {systemStatus?.message || 'Connecting...'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Navigation with Enhanced Design */}
        <nav className="mt-4 px-3">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  router.push(`/dashboard?tab=${item.id}`, { scroll: false });
                }}
                className={`w-full flex items-center px-4 py-4 mb-2 text-left transition-all duration-300 rounded-xl group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-blue-600 hover:shadow-md'
                }`}
                title={!sidebarOpen ? item.name : ''}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-blue-100'} p-2 rounded-lg transition-all duration-300`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`} />
                </div>
                {sidebarOpen && (
                  <div className="ml-4 flex-1">
                    <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-800 group-hover:text-blue-600'}`}>
                      {item.name}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-blue-500'}`}>
                      {item.description}
                    </div>
                  </div>
                )}
                {sidebarOpen && isActive && (
                  <ArrowRight className="w-4 h-4 text-white/80" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Quick Stats in Sidebar */}
        {sidebarOpen && dashboardStats && (
          <div className="absolute bottom-6 left-3 right-3">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Quick Stats</span>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-bold text-purple-600">
                    {dashboardStats.active_pipelines || 0}
                  </div>
                  <div className="text-purple-500">Pipelines</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-purple-600">
                    {dashboardStats.system_uptime ? `${Math.round(dashboardStats.system_uptime)}%` : '0%'}
                  </div>
                  <div className="text-purple-500">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading state for quick stats */}
        {sidebarOpen && loading && (
          <div className="absolute bottom-6 left-3 right-3">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-gray-300 rounded animate-pulse w-20"></div>
                <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center">
                  <div className="h-5 bg-gray-300 rounded animate-pulse mb-1 w-8 mx-auto"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-12 mx-auto"></div>
                </div>
                <div className="text-center">
                  <div className="h-5 bg-gray-300 rounded animate-pulse mb-1 w-8 mx-auto"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-10 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Beautiful Header with Gradient */}
        <div className="bg-gradient-to-r from-white via-blue-50 to-indigo-50 shadow-lg border-b border-gray-200/50 px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <currentItem.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent truncate">
                  {currentItem.name}
                </h2>
                <p className="text-gray-600 text-sm lg:text-base mt-1 hidden sm:block truncate">{currentItem.description}</p>
              </div>
            </div>

            {/* Status Indicators and User Controls */}
            <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
              {/* Status Indicators - Hidden on mobile */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  systemStatus?.status === 'healthy' 
                    ? 'bg-green-50' 
                    : systemStatus?.status === 'degraded'
                    ? 'bg-yellow-50'
                    : 'bg-red-50'
                }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    systemStatus?.status === 'healthy' 
                      ? 'bg-green-500' 
                      : systemStatus?.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    systemStatus?.status === 'healthy' 
                      ? 'text-green-700' 
                      : systemStatus?.status === 'degraded'
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}>
                    {systemStatus?.message || 'Connecting...'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* User Controls - Always visible */}
              <div className="flex items-center space-x-2 lg:space-x-3">
                {/* Notifications Dropdown */}
                <NotificationsDropdown />

                {/* User Profile Dropdown */}
                <UserProfileDropdown />
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Home className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">/</span>
              <span className="text-blue-600 font-medium">{currentItem.name}</span>
            </div>

            {/* Mobile Status Indicators */}
            <div className="flex lg:hidden items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  systemStatus?.status === 'healthy' 
                    ? 'bg-green-500' 
                    : systemStatus?.status === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}></div>
                <span className={`text-xs ${
                  systemStatus?.status === 'healthy' 
                    ? 'text-green-700' 
                    : systemStatus?.status === 'degraded'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>
                  {systemStatus?.status === 'healthy' ? 'Online' : 
                   systemStatus?.status === 'degraded' ? 'Degraded' : 'Offline'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Content Area */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50/50 to-blue-50/30">
          <div className="p-8">
            {/* Error State */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Dashboard Configuration Error</h3>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <button 
                      onClick={loadDashboardData}
                      className="mt-2 text-red-700 underline hover:text-red-800 text-sm font-medium"
                    >
                      Retry Loading
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <CurrentComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
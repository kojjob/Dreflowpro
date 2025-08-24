'use client';

import React, { useState, lazy, Suspense } from 'react';
import DashboardStats from './DashboardStats';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  BarChart3,
  Database,
  Activity,
  Settings,
  Menu,
  X,
  Home,
  Zap,
  Globe
} from 'lucide-react';

// Lazy load heavy components to improve initial load time
const PipelineManager = lazy(() => import('../pipelines/PipelineManager'));
const TaskMonitor = lazy(() => import('../tasks/TaskMonitor'));
const ConnectorManager = lazy(() => import('../connectors/ConnectorManager'));

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType;
  description: string;
}

const MainDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems: NavigationItem[] = [
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
      icon: Globe,
      component: ConnectorManager,
      description: 'Data source connections and configuration'
    },
    {
      id: 'tasks',
      name: 'Tasks',
      icon: Activity,
      component: TaskMonitor,
      description: 'Background task monitoring and management'
    }
  ];

  const currentItem = navigationItems.find(item => item.id === activeView) || navigationItems[0];
  const CurrentComponent = currentItem.component;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-white shadow-lg border-r border-gray-200`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">D-ReflowPro</h1>
                <p className="text-xs text-gray-500">ETL Platform</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center ${sidebarOpen ? 'px-4' : 'px-2 justify-center'} py-3 text-left rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={!sidebarOpen ? item.name : ''}
                  >
                    <item.icon className={`${sidebarOpen ? 'mr-3' : ''} w-5 h-5`} />
                    {sidebarOpen && (
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs opacity-75">{item.description}</div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="text-center text-xs text-gray-500">
              <div>Version 1.0.0</div>
              <div className="mt-1">Production Ready</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentItem.name}</h2>
              <p className="text-gray-600">{currentItem.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info Placeholder */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">A</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Admin User</div>
                  <div className="text-gray-500">admin@dreflowpro.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner size="large" text={`Loading ${currentItem.name}...`} />
              </div>
            }>
              <CurrentComponent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
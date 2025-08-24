'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Globe, 
  Clock, 
  Bell, 
  Monitor, 
  Sun, 
  Moon, 
  Smartphone,
  Mail,
  Volume2,
  Eye,
  Accessibility,
  Download,
  Upload,
  Save,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface PreferencesData {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    pipelineUpdates: boolean;
    systemAlerts: boolean;
    weeklyReports: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
    showWelcome: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reduceAnimations: boolean;
  };
}

const Preferences: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesData>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      desktop: true,
      pipelineUpdates: true,
      systemAlerts: true,
      weeklyReports: false
    },
    dashboard: {
      defaultView: 'overview',
      refreshInterval: 30000,
      showWelcome: true
    },
    accessibility: {
      fontSize: 'medium',
      highContrast: false,
      reduceAnimations: false
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        theme: user.preferences.theme || 'light',
        language: user.preferences.language || 'en',
        timezone: user.preferences.timezone || 'UTC',
        notifications: user.preferences.notifications || preferences.notifications,
        dashboard: user.preferences.dashboard || preferences.dashboard,
        accessibility: {
          fontSize: 'medium',
          highContrast: false,
          reduceAnimations: false
        }
      });
    }
  }, [user]);

  const handlePreferenceChange = (section: string, key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof PreferencesData],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await updateUser({
        preferences: {
          theme: preferences.theme,
          language: preferences.language,
          timezone: preferences.timezone,
          notifications: preferences.notifications,
          dashboard: preferences.dashboard
        }
      });
      setHasChanges(false);
      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPreferences = () => {
    if (user?.preferences) {
      setPreferences({
        theme: user.preferences.theme || 'light',
        language: user.preferences.language || 'en',
        timezone: user.preferences.timezone || 'UTC',
        notifications: user.preferences.notifications || preferences.notifications,
        dashboard: user.preferences.dashboard || preferences.dashboard,
        accessibility: {
          fontSize: 'medium',
          highContrast: false,
          reduceAnimations: false
        }
      });
      setHasChanges(false);
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' }
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const dashboardViews = [
    { value: 'overview', label: 'Overview' },
    { value: 'pipelines', label: 'Pipelines' },
    { value: 'data-analysis', label: 'Data Analysis' },
    { value: 'connectors', label: 'Connectors' }
  ];

  const refreshIntervals = [
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
    { value: 0, label: 'Manual only' }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent mb-2">
            Preferences
          </h1>
          <p className="text-gray-600">Customize your DreflowPro experience</p>
        </div>
        
        {hasChanges && (
          <div className="flex space-x-3">
            <button
              onClick={handleResetPreferences}
              className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor }
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handlePreferenceChange('theme', 'theme', theme.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    preferences.theme === theme.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <theme.icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium text-gray-900">{theme.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Localization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Localization</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', 'language', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', 'timezone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Monitor className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default View</label>
              <select
                value={preferences.dashboard.defaultView}
                onChange={(e) => handlePreferenceChange('dashboard', 'defaultView', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dashboardViews.map((view) => (
                  <option key={view.value} value={view.value}>
                    {view.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval</label>
              <select
                value={preferences.dashboard.refreshInterval}
                onChange={(e) => handlePreferenceChange('dashboard', 'refreshInterval', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {refreshIntervals.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Show Welcome Message</h3>
              <p className="text-sm text-gray-600">Display welcome message on dashboard</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dashboard.showWelcome}
                onChange={(e) => handlePreferenceChange('dashboard', 'showWelcome', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail },
            { key: 'push', label: 'Push Notifications', description: 'Receive push notifications on mobile', icon: Smartphone },
            { key: 'desktop', label: 'Desktop Notifications', description: 'Show desktop notifications in browser', icon: Monitor },
            { key: 'pipelineUpdates', label: 'Pipeline Updates', description: 'Notifications for pipeline status changes', icon: Bell },
            { key: 'systemAlerts', label: 'System Alerts', description: 'Important system notifications', icon: Volume2 },
            { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly summary reports', icon: Mail }
          ].map((notification) => (
            <div key={notification.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <notification.icon className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{notification.label}</h3>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications[notification.key as keyof typeof preferences.notifications]}
                  onChange={(e) => handlePreferenceChange('notifications', notification.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Accessibility */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Accessibility className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Accessibility</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Font Size</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' }
              ].map((size) => (
                <button
                  key={size.value}
                  onClick={() => handlePreferenceChange('accessibility', 'fontSize', size.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    preferences.accessibility.fontSize === size.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{size.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">High Contrast Mode</h3>
                <p className="text-sm text-gray-600">Increase contrast for better visibility</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.highContrast}
                  onChange={(e) => handlePreferenceChange('accessibility', 'highContrast', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Reduce Animations</h3>
                <p className="text-sm text-gray-600">Minimize motion and animations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.accessibility.reduceAnimations}
                  onChange={(e) => handlePreferenceChange('accessibility', 'reduceAnimations', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Download className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <Download className="w-6 h-6 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Export Data</div>
              <div className="text-sm text-gray-600">Download your account data</div>
            </div>
          </button>

          <button className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
            <Upload className="w-6 h-6 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Import Settings</div>
              <div className="text-sm text-gray-600">Import preferences from file</div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Preferences;

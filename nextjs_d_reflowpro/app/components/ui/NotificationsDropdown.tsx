'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellRing,
  Check,
  CheckCheck,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Zap,
  Database,
  Shield,
  CreditCard,
  Sparkles,
  Clock,
  Eye,
  Trash2
} from 'lucide-react';
import { apiService } from '../../services/api';
import { Notification, NotificationSummary, NotificationType } from '../../types/user';
import { toast } from 'sonner';

interface NotificationsDropdownProps {
  className?: string;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
    fetchNotificationSummary();
  }, []);

  // Set up real-time updates (polling every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchNotificationSummary();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const fetchNotifications = () => {
    console.log('🔔 Loading mock notifications directly');
    // Use mock data directly to avoid API delays
    setNotifications([
        {
          id: '1',
          type: 'pipeline',
          title: 'Pipeline Execution Completed',
          message: 'Customer Data Pipeline has finished processing 10,000 records successfully.',
          icon: 'check-circle',
          priority: 'medium',
          isRead: false,
          isActionable: true,
          action: {
            label: 'View Pipeline',
            url: '/dashboard?tab=pipelines&id=customer-data'
          },
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          metadata: { pipelineId: 'customer-data', recordsProcessed: 10000 }
        },
        {
          id: '2',
          type: 'error',
          title: 'Data Processing Error',
          message: 'Failed to process batch #1247 due to invalid data format.',
          icon: 'alert-circle',
          priority: 'high',
          isRead: false,
          isActionable: true,
          action: {
            label: 'Retry Processing',
            action: 'retry_batch',
            params: { batchId: '1247' }
          },
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          metadata: { batchId: '1247', errorCode: 'INVALID_FORMAT' }
        },
        {
          id: '3',
          type: 'system',
          title: 'System Maintenance Scheduled',
          message: 'Scheduled maintenance window on Sunday 2:00 AM - 4:00 AM UTC.',
          icon: 'info',
          priority: 'low',
          isRead: true,
          isActionable: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          metadata: { maintenanceWindow: '2024-01-28T02:00:00Z' }
        },
        {
          id: '4',
          type: 'billing',
          title: 'Subscription Renewal',
          message: 'Your Pro subscription will renew in 3 days for $29/month.',
          icon: 'credit-card',
          priority: 'medium',
          isRead: true,
          isActionable: true,
          action: {
            label: 'Manage Billing',
            url: '/dashboard?tab=billing'
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          metadata: { amount: 29, currency: 'USD', renewalDate: '2024-01-31' }
        }
      ]);
    setLoading(false);
    console.log('🔔 Mock notifications loaded');
  };

  const fetchNotificationSummary = () => {
    console.log('🔔 Loading mock notification summary');
    // Use mock data directly to avoid API delays
    setSummary({
        total: 4,
        unread: 2,
        byType: {
          system: 1,
          pipeline: 1,
          data_processing: 0,
          error: 1,
          warning: 0,
          success: 0,
          info: 1,
          security: 0,
          billing: 1,
          feature: 0
        },
        hasHighPriority: true
      });
    console.log('🔔 Mock notification summary loaded');
  };

  const getNotificationIcon = (type: NotificationType, iconName?: string) => {
    const iconMap = {
      'check-circle': CheckCircle,
      'alert-circle': AlertCircle,
      'info': Info,
      'alert-triangle': AlertTriangle,
      'credit-card': CreditCard
    };

    if (iconName && iconMap[iconName as keyof typeof iconMap]) {
      const IconComponent = iconMap[iconName as keyof typeof iconMap];
      return <IconComponent className="w-4 h-4" />;
    }

    switch (type) {
      case 'pipeline': return <Zap className="w-4 h-4" />;
      case 'data_processing': return <Database className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      case 'billing': return <CreditCard className="w-4 h-4" />;
      case 'feature': return <Sparkles className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: NotificationType, priority: string) => {
    if (priority === 'critical' || priority === 'high') {
      return 'text-red-600 bg-red-100';
    }
    
    switch (type) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'success': return 'text-green-600 bg-green-100';
      case 'pipeline': return 'text-blue-600 bg-blue-100';
      case 'billing': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      console.log('🔔 Marking notification as read:', notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setSummary(prev => prev ? { ...prev, unread: prev.unread - 1 } : null);
    }

    // Handle action
    if (notification.action) {
      if (notification.action.url) {
        router.push(notification.action.url);
        setIsOpen(false);
      } else if (notification.action.action) {
        // Handle custom actions
        handleCustomAction(notification.action.action, notification.action.params);
      }
    }
  };

  const handleCustomAction = async (action: string, params?: Record<string, any>) => {
    switch (action) {
      case 'retry_batch':
        toast.info('Retrying batch processing...');
        // Implement retry logic
        break;
      default:
        console.warn('Unknown notification action:', action);
    }
  };

  const handleMarkAllAsRead = () => {
    if (markingAllRead) return;
    
    setMarkingAllRead(true);
    console.log('🔔 Marking all notifications as read');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setSummary(prev => prev ? { ...prev, unread: 0 } : null);
    toast.success('All notifications marked as read');
    setMarkingAllRead(false);
  };

  const handleViewAllNotifications = () => {
    router.push('/dashboard?tab=notifications');
    setIsOpen(false);
  };

  const unreadCount = summary?.unread || 0;
  const hasNotifications = notifications.length > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2 rounded-xl hover:bg-white/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-6 h-6 text-gray-700" />
        ) : (
          <Bell className="w-6 h-6 text-gray-700" />
        )}
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* High Priority Indicator */}
        {summary?.hasHighPriority && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 z-[9999] max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50"
                    >
                      {markingAllRead ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <span>Marking...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
              {summary && (
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>{summary.total} total</span>
                  {unreadCount > 0 && <span>{unreadCount} unread</span>}
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 rounded-xl animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                        <div className="w-full h-3 bg-gray-200 rounded mb-1" />
                        <div className="w-1/2 h-3 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : hasNotifications ? (
                <div className="p-2">
                  {notifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start space-x-3 p-3 rounded-xl transition-all duration-200 text-left hover:bg-blue-50 ${
                        !notification.isRead ? 'bg-blue-25 border-l-4 border-blue-500' : ''
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getNotificationColor(notification.type, notification.priority)}`}>
                        {getNotificationIcon(notification.type, notification.icon)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`font-medium text-sm ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-1 ml-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.isActionable && notification.action && (
                          <div className="flex items-center space-x-1 mt-2">
                            <ExternalLink className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">
                              {notification.action.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-900 mb-1">No notifications</h4>
                  <p className="text-sm text-gray-500">You're all caught up! Check back later for updates.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {hasNotifications && (
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={handleViewAllNotifications}
                  className="w-full flex items-center justify-center space-x-2 p-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <Eye className="w-4 h-4" />
                  <span>View all notifications</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;

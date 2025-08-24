'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronDown,
  Crown,
  Shield,
  Eye,
  Users,
  Palette,
  Bell,
  Globe,
  Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface UserProfileDropdownProps {
  className?: string;
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use authentication context
  const { user, loading, logout, isAuthenticated } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLogoutConfirm(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'Admin': return <Shield className="w-3 h-3" />;
      case 'Manager': return <Users className="w-3 h-3" />;
      case 'User': return <User className="w-3 h-3" />;
      case 'Viewer': return <Eye className="w-3 h-3" />;
      default: return <User className="w-3 h-3" />;
    }
  };

  const getRoleColor = (color: string) => {
    const colors = {
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getSubscriptionIcon = (planName: string) => {
    switch (planName) {
      case 'Enterprise': return <Crown className="w-3 h-3" />;
      case 'Pro': return <Zap className="w-3 h-3" />;
      default: return null;
    }
  };

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (tab: string) => {
    console.log('🔗 Navigating to tab:', tab);
    setIsOpen(false); // Close dropdown
    router.push(`/dashboard?tab=${tab}`);
  };

  const menuItems = [
    {
      icon: User,
      label: 'Profile Settings',
      action: () => handleNavigation('profile'),
      description: 'Manage your account details',
      show: true
    },
    {
      icon: Settings,
      label: 'Preferences',
      action: () => handleNavigation('preferences'),
      description: 'Theme, language, and notifications',
      show: true
    },
    {
      icon: CreditCard,
      label: 'Billing & Subscription',
      action: () => handleNavigation('billing'),
      description: 'Manage your subscription',
      show: true // Show for all users, not just paid users
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      action: () => handleNavigation('help'),
      description: 'Get help and support',
      show: true
    }
  ];

  if (loading) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="hidden md:block">
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-gray-600" />
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-medium text-gray-600">Guest</div>
          <div className="text-xs text-gray-500">Not logged in</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {getUserInitials(user.firstName, user.lastName)}
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>

        {/* User Info (hidden on mobile) */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 z-[9999]"
          >
            {/* User Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-medium shadow-sm">
                    {getUserInitials(user.firstName, user.lastName)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {/* Role Badge */}
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role.color)}`}>
                      {getRoleIcon(user.role.name)}
                      <span>{user.role.name}</span>
                    </span>
                    {/* Subscription Badge */}
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getSubscriptionColor(user.subscription.tier)}`}>
                      {getSubscriptionIcon(user.subscription.name)}
                      <span>{user.subscription.name}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.filter(item => item.show !== false).map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    console.log('🖱️ Menu item clicked:', item.label);
                    item.action();
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <item.icon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 group-hover:text-blue-900">{item.label}</div>
                    <div className="text-xs text-gray-500 group-hover:text-blue-600">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Logout Section */}
            <div className="p-2 border-t border-gray-100">
              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-all duration-200 text-left group"
                >
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                    <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 group-hover:text-red-900">Sign Out</div>
                    <div className="text-xs text-gray-500 group-hover:text-red-600">End your current session</div>
                  </div>
                </button>
              ) : (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm text-red-800 mb-3">Are you sure you want to sign out?</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleLogout}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Yes, Sign Out
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Upgrade Prompt (if applicable) */}
            {user.subscription.canUpgrade && user.subscription.tier === 'free' && (
              <div className="p-4 border-t border-gray-100">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Upgrade to Pro</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-3">Unlock unlimited pipelines and advanced features</p>
                  <button
                    onClick={() => {
                      router.push('/dashboard?tab=billing');
                      setIsOpen(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileDropdown;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  subscription: SubscriptionPlan;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt?: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

export interface UserRole {
  id: string;
  name: 'Admin' | 'User' | 'Viewer' | 'Manager';
  permissions: string[];
  color: 'red' | 'blue' | 'green' | 'purple' | 'orange';
}

export interface SubscriptionPlan {
  id: string;
  name: 'Free' | 'Pro' | 'Enterprise' | 'Custom';
  tier: 'free' | 'paid' | 'enterprise';
  features: string[];
  limits: {
    pipelines: number;
    dataProcessing: number; // GB per month
    apiCalls: number;
    users: number;
  };
  isActive: boolean;
  expiresAt?: string;
  canUpgrade: boolean;
}

export interface UserPreferences {
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
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  isActionable: boolean;
  action?: NotificationAction;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  params?: Record<string, any>;
}

export type NotificationType = 
  | 'system'
  | 'pipeline'
  | 'data_processing'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'security'
  | 'billing'
  | 'feature';

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  hasHighPriority: boolean;
}

export interface UserSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
  permissions: string[];
}

export interface UserProfileUpdate {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  desktop: boolean;
  types: Record<NotificationType, boolean>;
}

/**
 * Mock API Service
 * Provides fallback data when the backend API is not available
 */

import Logger from '../utils/logger';

export interface MockHealthStatus {
  status: string;
  app: string;
  version: string;
  environment: string;
  services: {
    database: string;
    redis: string;
  };
}

export interface MockTaskMetrics {
  timestamp: string;
  daily_stats: {
    total_tasks: number;
    successful_tasks: number;
    failed_tasks: number;
    running_tasks: number;
    pending_tasks: number;
    success_rate: number;
  };
  task_types: Record<string, number>;
  average_execution_times: Record<string, number>;
  queue_performance: Record<string, {
    avg_wait_time: number;
    throughput: number;
  }>;
  data_processing_stats?: {
    total_records_processed: number;
    successful_records: number;
    failed_records: number;
  };
}

export interface MockPipeline {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  steps: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, any>;
    order: number;
  }>;
  last_execution?: {
    id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    records_processed: number;
    execution_time: number;
  };
}

export interface MockConnector {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'csv' | 'api' | 'mongodb';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_sync?: string;
  record_count?: number;
}

export interface MockReport {
  id: string;
  title: string;
  description?: string;
  report_type: 'EXECUTIVE' | 'ANALYST' | 'PRESENTATION' | 'DASHBOARD_EXPORT';
  format: 'PDF' | 'EXCEL' | 'POWERPOINT' | 'CSV' | 'JSON';
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  user_id: string;
  organization_id: string;
  dataset_id?: string;
  pipeline_id?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  download_count: number;
  view_count: number;
  is_scheduled: boolean;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MockReportStatistics {
  period_days: number;
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  failed_reports: number;
  total_downloads: number;
  reports_by_status: Record<string, number>;
  reports_by_type: Record<string, number>;
  recent_reports: MockReport[];
}

class MockApiService {
  private isApiAvailable = false;

  // Mock data
  private mockHealthStatus: MockHealthStatus = {
    status: 'healthy',
    app: 'DreflowPro',
    version: '1.0.0',
    environment: 'development',
    services: {
      database: 'healthy',
      redis: 'healthy'
    }
  };

  private mockTaskMetrics: MockTaskMetrics = {
    timestamp: new Date().toISOString(),
    daily_stats: {
      total_tasks: 156,
      successful_tasks: 142,
      failed_tasks: 8,
      running_tasks: 4,
      pending_tasks: 2,
      success_rate: 91.0
    },
    task_types: {
      'data_processing': 45,
      'pipeline_execution': 38,
      'report_generation': 28,
      'data_validation': 25,
      'notification': 20
    },
    average_execution_times: {
      'data_processing': 125.5,
      'pipeline_execution': 89.2,
      'report_generation': 234.8,
      'data_validation': 45.3,
      'notification': 12.1
    },
    queue_performance: {
      'high_priority': {
        avg_wait_time: 2.3,
        throughput: 45.2
      },
      'normal_priority': {
        avg_wait_time: 8.7,
        throughput: 32.1
      },
      'low_priority': {
        avg_wait_time: 25.4,
        throughput: 18.9
      }
    },
    data_processing_stats: {
      total_records_processed: 2847392,
      successful_records: 2834156,
      failed_records: 13236
    }
  };

  private mockPipelines: MockPipeline[] = [
    {
      id: '1',
      name: 'Customer Data Pipeline',
      description: 'Processes customer data from multiple sources',
      status: 'active',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-20T14:22:00Z',
      steps: [
        {
          id: 'step1',
          type: 'source',
          name: 'PostgreSQL Source',
          config: { table: 'customers', connection_id: 'pg_main' },
          order: 1
        },
        {
          id: 'step2',
          type: 'transform',
          name: 'Data Validation',
          config: { rules: ['email_format', 'phone_format'] },
          order: 2
        },
        {
          id: 'step3',
          type: 'destination',
          name: 'Data Warehouse',
          config: { table: 'dim_customers' },
          order: 3
        }
      ],
      last_execution: {
        id: 'exec_123',
        status: 'completed',
        started_at: '2024-01-20T14:00:00Z',
        completed_at: '2024-01-20T14:05:30Z',
        rows_processed: 10000,
        records_processed: 10000,
        execution_time: 330
      }
    },
    {
      id: '2',
      name: 'Sales Analytics ETL',
      description: 'Aggregates sales data for reporting',
      status: 'running',
      created_at: '2024-01-10T09:15:00Z',
      updated_at: '2024-01-20T16:45:00Z',
      steps: [
        {
          id: 'step1',
          type: 'source',
          name: 'Sales API',
          config: { endpoint: '/api/sales', auth_type: 'mock_bearer' },
          order: 1
        },
        {
          id: 'step2',
          type: 'transform',
          name: 'Aggregation',
          config: { group_by: ['date', 'product_id'], metrics: ['sum', 'count'] },
          order: 2
        }
      ],
      last_execution: {
        id: 'exec_124',
        status: 'running',
        started_at: '2024-01-20T16:30:00Z',
        rows_processed: 5432,
        records_processed: 5432,
        execution_time: 900
      }
    }
  ];

  private mockConnectors: MockConnector[] = [
    {
      id: '1',
      name: 'Main PostgreSQL',
      type: 'postgresql',
      status: 'connected',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'dreflowpro',
        username: 'admin'
      },
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-20T14:22:00Z',
      last_sync: '2024-01-20T16:45:00Z',
      record_count: 125000
    },
    {
      id: '2',
      name: 'Customer CSV',
      type: 'csv',
      status: 'connected',
      config: {
        file_path: '/data/customers.csv',
        delimiter: ',',
        has_header: true
      },
      created_at: '2024-01-18T11:20:00Z',
      updated_at: '2024-01-19T09:15:00Z',
      last_sync: '2024-01-19T09:15:00Z',
      record_count: 8500
    },
    {
      id: '3',
      name: 'Sales API',
      type: 'api',
      status: 'connected',
      config: {
        base_url: 'https://mock-api.example.com',
        auth_type: 'mock_oauth2',
        rate_limit: 1000
      },
      created_at: '2024-01-12T14:45:00Z',
      updated_at: '2024-01-20T10:30:00Z',
      last_sync: '2024-01-20T16:00:00Z',
      record_count: 45000
    }
  ];

  private mockReports: MockReport[] = [
    {
      id: '1',
      title: 'Q4 Executive Summary',
      description: 'Quarterly executive report with key metrics and insights',
      report_type: 'EXECUTIVE',
      format: 'PDF',
      status: 'COMPLETED',
      user_id: '1',
      organization_id: '1',
      dataset_id: 'dataset_1',
      file_path: '/reports/q4-executive-summary.pdf',
      file_name: 'Q4_Executive_Summary.pdf',
      file_size: 2048576, // 2MB
      download_count: 15,
      view_count: 42,
      is_scheduled: false,
      generated_at: '2024-01-20T14:30:00Z',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T14:30:00Z'
    },
    {
      id: '2',
      title: 'Customer Analytics Report',
      description: 'Detailed analysis of customer behavior and trends',
      report_type: 'ANALYST',
      format: 'EXCEL',
      status: 'COMPLETED',
      user_id: '1',
      organization_id: '1',
      pipeline_id: 'pipeline_1',
      file_path: '/reports/customer-analytics.xlsx',
      file_name: 'Customer_Analytics_Report.xlsx',
      file_size: 1536000, // 1.5MB
      download_count: 8,
      view_count: 23,
      is_scheduled: true,
      generated_at: '2024-01-19T16:45:00Z',
      created_at: '2024-01-19T09:00:00Z',
      updated_at: '2024-01-19T16:45:00Z'
    },
    {
      id: '3',
      title: 'Sales Performance Dashboard',
      description: 'Monthly sales performance metrics and KPIs',
      report_type: 'DASHBOARD_EXPORT',
      format: 'PDF',
      status: 'GENERATING',
      user_id: '1',
      organization_id: '1',
      dataset_id: 'dataset_2',
      download_count: 0,
      view_count: 0,
      is_scheduled: false,
      created_at: '2024-01-21T08:30:00Z',
      updated_at: '2024-01-21T08:30:00Z'
    },
    {
      id: '4',
      title: 'Board Presentation',
      description: 'Quarterly board presentation with financial highlights',
      report_type: 'PRESENTATION',
      format: 'POWERPOINT',
      status: 'FAILED',
      user_id: '1',
      organization_id: '1',
      dataset_id: 'dataset_3',
      download_count: 0,
      view_count: 0,
      is_scheduled: false,
      created_at: '2024-01-18T14:00:00Z',
      updated_at: '2024-01-18T14:15:00Z'
    }
  ];

  private mockReportStatistics: MockReportStatistics = {
    period_days: 30,
    total_reports: 12,
    completed_reports: 8,
    pending_reports: 1,
    failed_reports: 3,
    total_downloads: 45,
    reports_by_status: {
      'COMPLETED': 8,
      'GENERATING': 1,
      'PENDING': 0,
      'FAILED': 3,
      'CANCELLED': 0
    },
    reports_by_type: {
      'EXECUTIVE': 3,
      'ANALYST': 4,
      'PRESENTATION': 2,
      'DASHBOARD_EXPORT': 3
    },
    recent_reports: []
  };

  async getHealthStatus(): Promise<MockHealthStatus> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockHealthStatus;
  }

  async getTaskMetrics(): Promise<MockTaskMetrics> {
    // Simulate API delay and update timestamp
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      ...this.mockTaskMetrics,
      timestamp: new Date().toISOString()
    };
  }

  async getPipelines(): Promise<MockPipeline[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return this.mockPipelines;
  }

  async getPipeline(id: string): Promise<MockPipeline | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockPipelines.find(p => p.id === id) || null;
  }

  async getConnectors(): Promise<MockConnector[]> {
    await new Promise(resolve => setTimeout(resolve, 350));
    return this.mockConnectors;
  }

  async getConnector(id: string): Promise<MockConnector | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockConnectors.find(c => c.id === id) || null;
  }

  // Simulate creating a new pipeline
  async createPipeline(data: { name: string; description: string }): Promise<MockPipeline> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newPipeline: MockPipeline = {
      id: (this.mockPipelines.length + 1).toString(),
      name: data.name,
      description: data.description,
      status: 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      steps: []
    };
    
    this.mockPipelines.push(newPipeline);
    return newPipeline;
  }

  // Simulate creating a new connector
  async createConnector(data: { name: string; type: string; config: any }): Promise<MockConnector> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newConnector: MockConnector = {
      id: (this.mockConnectors.length + 1).toString(),
      name: data.name,
      type: data.type as any,
      status: 'disconnected',
      config: data.config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.mockConnectors.push(newConnector);
    return newConnector;
  }

  // Get pipeline executions
  async getPipelineExecutions(pipelineId: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return mock executions for the pipeline
    const pipeline = this.mockPipelines.find(p => p.id === pipelineId);
    if (!pipeline || !pipeline.last_execution) {
      return [];
    }

    // Generate a few mock executions
    return [
      pipeline.last_execution,
      {
        id: 'exec_122',
        status: 'completed',
        started_at: '2024-01-19T10:30:00Z',
        completed_at: '2024-01-19T10:35:15Z',
        rows_processed: 8500,
        records_processed: 8500,
        execution_time: 315
      },
      {
        id: 'exec_121',
        status: 'failed',
        started_at: '2024-01-18T16:20:00Z',
        completed_at: '2024-01-18T16:22:30Z',
        rows_processed: 1200,
        records_processed: 1200,
        execution_time: 150
      }
    ];
  }

  // USER AND NOTIFICATION MOCK DATA
  // ========================================

  getCurrentUser() {
    Logger.log('📝 MockAPI: getCurrentUser called');

    // Default user data
    const defaultUser = {
      id: '1',
      email: 'admin@dreflowpro.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      avatar: '',
      role: {
        id: '1',
        name: 'Admin',
        permissions: ['all'],
        color: 'red'
      },
      subscription: {
        id: '1',
        name: 'Pro',
        tier: 'paid',
        features: ['unlimited_pipelines', 'advanced_analytics', 'priority_support'],
        limits: {
          pipelines: -1,
          dataProcessing: 1000,
          apiCalls: 100000,
          users: 10
        },
        isActive: true,
        expiresAt: '2024-12-31T23:59:59Z',
        canUpgrade: true
      },
      preferences: {
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
        }
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: new Date().toISOString(),
      isEmailVerified: true,
      isActive: true
    };

    // Try to load saved profile data from localStorage
    try {
      const savedProfile = localStorage.getItem('dreflowpro_user_profile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        Logger.log('💾 Loaded saved user profile from localStorage:', parsedProfile);
        return parsedProfile;
      }
    } catch (error) {
      Logger.warn('Failed to load user profile from localStorage:', error);
    }

    // Return default user if no saved profile
    return defaultUser;
  }

  getNotifications(params?: { limit?: number; offset?: number; unreadOnly?: boolean }) {
    const allNotifications = [
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
      },
      {
        id: '5',
        type: 'feature',
        title: 'New Feature Available',
        message: 'AI-powered data insights are now available in your dashboard.',
        icon: 'sparkles',
        priority: 'low',
        isRead: true,
        isActionable: true,
        action: {
          label: 'Explore AI Insights',
          url: '/dashboard?tab=ai-insights'
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { feature: 'ai_insights' }
      }
    ];

    let filteredNotifications = allNotifications;

    if (params?.unreadOnly) {
      filteredNotifications = allNotifications.filter(n => !n.isRead);
    }

    const limit = params?.limit || 10;
    const offset = params?.offset || 0;

    return {
      notifications: filteredNotifications.slice(offset, offset + limit),
      total: filteredNotifications.length,
      unread: allNotifications.filter(n => !n.isRead).length
    };
  }

  getNotificationSummary() {
    const notifications = this.getNotifications().notifications;
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
      total: notifications.length,
      unread: unreadCount,
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
        feature: 1
      },
      hasHighPriority: notifications.some(n => n.priority === 'high' || n.priority === 'critical')
    };
  }

  markNotificationAsRead(notificationId: string) {
    return { success: true, message: 'Notification marked as read' };
  }

  markAllNotificationsAsRead() {
    return { success: true, message: 'All notifications marked as read' };
  }

  updateUserProfile(profileData: any) {
    Logger.log('📝 MockAPI: updateUserProfile called with:', profileData);

    // Get current user data
    const currentUser = this.getCurrentUser();

    // Merge with new profile data
    const updatedUser = { ...currentUser, ...profileData };

    // Persist to localStorage for development
    try {
      localStorage.setItem('dreflowpro_user_profile', JSON.stringify(updatedUser));
      Logger.log('💾 User profile saved to localStorage:', updatedUser);
    } catch (error) {
      Logger.warn('Failed to save user profile to localStorage:', error);
    }

    return updatedUser;
  }

  changePassword(passwordData: any) {
    return { success: true, message: 'Password changed successfully' };
  }

  getNotificationSettings() {
    return {
      email: true,
      push: true,
      desktop: true,
      types: {
        system: true,
        pipeline: true,
        data_processing: true,
        error: true,
        warning: true,
        success: true,
        info: true,
        security: true,
        billing: true,
        feature: true
      }
    };
  }

  updateNotificationSettings(settings: any) {
    return { ...this.getNotificationSettings(), ...settings };
  }

  // Check if real API is available
  async checkApiAvailability(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      this.isApiAvailable = response.ok;
      return this.isApiAvailable;
    } catch (error) {
      this.isApiAvailable = false;
      return false;
    }
  }

  getApiStatus(): boolean {
    return this.isApiAvailable;
  }

  // ========================================
  // REPORTS MOCK DATA
  // ========================================

  async getReports(params: { report_type?: string; status?: string; limit?: number; offset?: number } = {}): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

    let filteredReports = [...this.mockReports];

    // Apply filters
    if (params.report_type) {
      filteredReports = filteredReports.filter(r => r.report_type === params.report_type);
    }
    if (params.status) {
      filteredReports = filteredReports.filter(r => r.status === params.status);
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const paginatedReports = filteredReports.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        reports: paginatedReports,
        total_count: filteredReports.length,
        page_size: limit,
        offset: offset,
        has_more: offset + limit < filteredReports.length
      }
    };
  }

  async getReportStatistics(days: number = 30): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay

    // Update recent reports with the latest ones
    const recentReports = this.mockReports
      .filter(r => r.status === 'COMPLETED')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      success: true,
      data: {
        ...this.mockReportStatistics,
        period_days: days,
        recent_reports: recentReports
      }
    };
  }

  async createReport(reportData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API delay

    const newReport: MockReport = {
      id: (this.mockReports.length + 1).toString(),
      title: reportData.title,
      description: reportData.description,
      report_type: reportData.report_type,
      format: reportData.format,
      status: 'PENDING',
      user_id: '1',
      organization_id: '1',
      dataset_id: reportData.dataset_id,
      pipeline_id: reportData.pipeline_id,
      download_count: 0,
      view_count: 0,
      is_scheduled: !!reportData.schedule_config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.mockReports.push(newReport);

    return {
      success: true,
      data: {
        report: newReport,
        message: 'Report created successfully'
      }
    };
  }

  async generateReport(reportId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

    const report = this.mockReports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    // Update report status to generating
    report.status = 'GENERATING';
    report.updated_at = new Date().toISOString();

    return {
      success: true,
      data: {
        message: 'Report generation started',
        task_id: `task_${reportId}_${Date.now()}`
      }
    };
  }

  async deleteReport(reportId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay

    const reportIndex = this.mockReports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) {
      throw new Error('Report not found');
    }

    this.mockReports.splice(reportIndex, 1);

    return {
      success: true,
      message: 'Report deleted successfully'
    };
  }
}

export const mockApiService = new MockApiService();

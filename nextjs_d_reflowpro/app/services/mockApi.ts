/**
 * Mock API Service
 * Provides fallback data when the backend API is not available
 */

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
          config: { endpoint: '/api/sales', auth_type: 'bearer' },
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
        base_url: 'https://api.salesforce.com',
        auth_type: 'oauth2',
        rate_limit: 1000
      },
      created_at: '2024-01-12T14:45:00Z',
      updated_at: '2024-01-20T10:30:00Z',
      last_sync: '2024-01-20T16:00:00Z',
      record_count: 45000
    }
  ];

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
    console.log('📝 MockAPI: getCurrentUser called');
    return {
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
    return { ...this.getCurrentUser(), ...profileData };
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
}

export const mockApiService = new MockApiService();

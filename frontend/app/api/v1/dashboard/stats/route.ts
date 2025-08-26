import { NextRequest, NextResponse } from 'next/server';

/**
 * Dashboard Stats API Route
 * Provides fallback dashboard statistics when backend is unavailable
 */

const MOCK_DASHBOARD_STATS = {
  pipelines: {
    total: 12,
    active: 8,
    running: 3,
    failed: 1,
    scheduled: 2
  },
  connectors: {
    total: 15,
    connected: 12,
    disconnected: 2,
    error: 1
  },
  tasks: {
    total: 150,
    completed: 135,
    running: 8,
    failed: 5,
    pending: 2
  },
  system: {
    cpu_usage: 45.2,
    memory_usage: 68.7,
    disk_usage: 34.1,
    uptime: 86400000 // 1 day in milliseconds
  },
  recent_activity: [
    {
      id: 'activity-1',
      type: 'pipeline_completed',
      message: 'Data pipeline "Customer Analytics" completed successfully',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'success' as const
    },
    {
      id: 'activity-2',
      type: 'connector_connected',
      message: 'Database connector "PostgreSQL-Prod" established',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'info' as const
    },
    {
      id: 'activity-3',
      type: 'task_failed',
      message: 'Data validation task failed - invalid schema',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'error' as const
    },
    {
      id: 'activity-4',
      type: 'pipeline_started',
      message: 'ETL pipeline "Sales Data Sync" started processing',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'info' as const
    },
    {
      id: 'activity-5',
      type: 'connector_error',
      message: 'API connector "CRM System" connection timeout',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'warning' as const
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    // Check if backend is available
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    try {
      // Try to forward request to backend if we have auth headers
      if (authHeader && authHeader !== 'Bearer ') {
        const response = await fetch(`${backendUrl}/api/v1/dashboard/stats`, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          timeout: 5000
        } as any);

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ data });
        } else if (response.status === 401) {
          // If backend auth fails, fall back to mock data for development
          console.log('🔐 Backend authentication failed, using mock data for development');
        } else {
          throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }
      } else {
        // No auth header, try backend anyway to see if it's available
        const healthResponse = await fetch(`${backendUrl}/health`, { timeout: 2000 } as any);
        if (!healthResponse.ok) {
          throw new Error('Backend not available');
        }
        console.log('🔐 No authentication provided, using mock data');
      }
    } catch (backendError) {
      console.log('🏠 Backend dashboard stats not available, using mock data');
    }
    
    // Return mock data when backend is unavailable or auth fails
    const randomizedStats = {
      ...MOCK_DASHBOARD_STATS,
      pipelines: {
        ...MOCK_DASHBOARD_STATS.pipelines,
        running: Math.floor(Math.random() * 5) + 1,
      },
      system: {
        ...MOCK_DASHBOARD_STATS.system,
        cpu_usage: Math.floor(Math.random() * 40) + 30,
        memory_usage: Math.floor(Math.random() * 30) + 50,
        disk_usage: Math.floor(Math.random() * 20) + 25,
      }
    };

    return NextResponse.json({ data: randomizedStats });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard statistics' },
      { status: 500 }
    );
  }
}
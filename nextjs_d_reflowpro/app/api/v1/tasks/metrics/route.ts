import { NextRequest, NextResponse } from 'next/server';

// Mock task metrics data
const mockTaskMetrics = {
  daily_stats: {
    total_tasks: 156,
    successful_tasks: 142,
    failed_tasks: 8,
    running_tasks: 6,
    success_rate: 91.0,
    avg_execution_time: 2.34,
    total_records_processed: 1250000,
    date: new Date().toISOString().split('T')[0]
  },
  weekly_stats: {
    total_tasks: 1089,
    successful_tasks: 1021,
    failed_tasks: 45,
    running_tasks: 23,
    success_rate: 93.8,
    avg_execution_time: 2.67,
    total_records_processed: 8750000,
    week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  monthly_stats: {
    total_tasks: 4567,
    successful_tasks: 4289,
    failed_tasks: 189,
    running_tasks: 89,
    success_rate: 93.9,
    avg_execution_time: 2.45,
    total_records_processed: 35600000,
    month_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  },
  task_types: {
    data_processing: 89,
    pipeline_execution: 34,
    report_generation: 18,
    data_validation: 12,
    notification: 3
  },
  average_execution_times: {
    data_processing: 3.45,
    pipeline_execution: 1.89,
    report_generation: 5.67,
    data_validation: 0.78,
    notification: 0.23
  },
  queue_performance: {
    high_priority: {
      avg_wait_time: 0.5,
      throughput: 120,
      current_size: 3
    },
    normal_priority: {
      avg_wait_time: 2.1,
      throughput: 85,
      current_size: 12
    },
    low_priority: {
      avg_wait_time: 8.7,
      throughput: 45,
      current_size: 28
    }
  },
  data_processing_stats: {
    total_records_processed: 1250000,
    successful_records: 1238750,
    failed_records: 11250,
    processing_rate: 5234.5,
    avg_record_size: 2.3,
    data_quality_score: 94.2
  },
  system_health: {
    status: 'healthy',
    uptime_percentage: 99.8,
    last_incident: '2024-01-15T08:30:00Z',
    active_workers: 12,
    total_workers: 15,
    memory_usage: 68.5,
    cpu_usage: 42.3,
    disk_usage: 34.7,
    network_throughput: 125.6
  },
  recent_activities: [
    {
      id: '1',
      type: 'pipeline_execution',
      name: 'Customer Data Pipeline',
      status: 'completed',
      started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      records_processed: 10000,
      execution_time: 2.34
    },
    {
      id: '2',
      type: 'data_upload',
      name: 'Sales Data Q1 2024',
      status: 'completed',
      started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      records_processed: 25000,
      file_size: '15.2MB'
    },
    {
      id: '3',
      type: 'connector_sync',
      name: 'Shopify Store Connection',
      status: 'running',
      started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      records_processed: 5432,
      progress: 67
    },
    {
      id: '4',
      type: 'system_optimization',
      name: 'Database Index Optimization',
      status: 'completed',
      started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      improvement: '23% faster queries'
    },
    {
      id: '5',
      type: 'report_generation',
      name: 'Weekly Analytics Report',
      status: 'completed',
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      report_size: '8.7MB',
      charts_generated: 12
    }
  ],
  performance_trends: {
    last_7_days: [
      { date: '2024-01-14', success_rate: 92.5, avg_time: 2.1, tasks: 145 },
      { date: '2024-01-15', success_rate: 94.2, avg_time: 2.3, tasks: 167 },
      { date: '2024-01-16', success_rate: 91.8, avg_time: 2.5, tasks: 134 },
      { date: '2024-01-17', success_rate: 95.1, avg_time: 2.0, tasks: 189 },
      { date: '2024-01-18', success_rate: 93.7, avg_time: 2.4, tasks: 156 },
      { date: '2024-01-19', success_rate: 96.3, avg_time: 1.9, tasks: 178 },
      { date: '2024-01-20', success_rate: 91.0, avg_time: 2.34, tasks: 156 }
    ]
  },
  alerts: [
    {
      id: 'alert_1',
      type: 'warning',
      message: 'High queue wait time detected in low priority queue',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved: false
    },
    {
      id: 'alert_2',
      type: 'info',
      message: 'Scheduled maintenance completed successfully',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved: true
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const include_trends = searchParams.get('include_trends') === 'true';
    const include_activities = searchParams.get('include_activities') === 'true';

    let responseData = { ...mockTaskMetrics };

    // Filter data based on period
    if (period === 'weekly') {
      responseData.daily_stats = responseData.weekly_stats;
    } else if (period === 'monthly') {
      responseData.daily_stats = responseData.monthly_stats;
    }

    // Conditionally include trends and activities
    if (!include_trends) {
      delete responseData.performance_trends;
    }

    if (!include_activities) {
      delete responseData.recent_activities;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Task metrics retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching task metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch task metrics',
        message: 'An error occurred while retrieving task metrics'
      },
      { status: 500 }
    );
  }
}

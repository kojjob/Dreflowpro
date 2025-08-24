import { NextRequest, NextResponse } from 'next/server';

// Mock task history data
const mockTaskHistory = [
  {
    id: 'task_001',
    name: 'Customer Data Pipeline Execution',
    type: 'pipeline_execution',
    status: 'completed',
    priority: 'high',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    execution_time: 2.34,
    records_processed: 10000,
    pipeline_id: '1',
    user_id: 'user_123',
    result: {
      success: true,
      message: 'Pipeline executed successfully',
      output_records: 9987,
      transformations_applied: 3
    }
  },
  {
    id: 'task_002',
    name: 'Sales Data Upload Processing',
    type: 'data_processing',
    status: 'completed',
    priority: 'normal',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    execution_time: 6.12,
    records_processed: 25000,
    file_id: 'file_456',
    user_id: 'user_123',
    result: {
      success: true,
      message: 'File processed successfully',
      file_size: '15.2MB',
      data_quality_score: 94.2
    }
  },
  {
    id: 'task_003',
    name: 'Shopify Connector Sync',
    type: 'connector_sync',
    status: 'running',
    priority: 'normal',
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    execution_time: null,
    records_processed: 5432,
    connector_id: '2',
    user_id: 'user_123',
    progress: 67,
    estimated_completion: new Date(Date.now() + 2 * 60 * 1000).toISOString()
  },
  {
    id: 'task_004',
    name: 'Weekly Analytics Report Generation',
    type: 'report_generation',
    status: 'completed',
    priority: 'low',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 58 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    execution_time: 13.45,
    report_id: 'report_789',
    user_id: 'user_123',
    result: {
      success: true,
      message: 'Report generated successfully',
      report_size: '8.7MB',
      charts_generated: 12,
      export_format: 'PDF'
    }
  },
  {
    id: 'task_005',
    name: 'Data Validation Check',
    type: 'data_validation',
    status: 'failed',
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 119 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    execution_time: 4.23,
    records_processed: 1250,
    file_id: 'file_999',
    user_id: 'user_456',
    result: {
      success: false,
      message: 'Validation failed: Invalid data format detected',
      error_code: 'VALIDATION_ERROR',
      errors_found: 23,
      error_details: [
        'Row 45: Invalid email format',
        'Row 67: Missing required field "customer_id"',
        'Row 89: Date format not recognized'
      ]
    }
  },
  {
    id: 'task_006',
    name: 'Database Backup Task',
    type: 'maintenance',
    status: 'completed',
    priority: 'low',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 178 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 165 * 60 * 1000).toISOString(),
    execution_time: 13.67,
    user_id: 'system',
    result: {
      success: true,
      message: 'Database backup completed successfully',
      backup_size: '2.3GB',
      backup_location: 's3://backups/db_backup_20240120.sql.gz'
    }
  },
  {
    id: 'task_007',
    name: 'Email Notification Batch',
    type: 'notification',
    status: 'completed',
    priority: 'normal',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 238 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 237 * 60 * 1000).toISOString(),
    execution_time: 0.89,
    user_id: 'system',
    result: {
      success: true,
      message: 'Notifications sent successfully',
      emails_sent: 45,
      delivery_rate: 97.8
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';

    let filteredTasks = [...mockTaskHistory];

    // Apply filters
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }

    if (type) {
      filteredTasks = filteredTasks.filter(task => task.type === type);
    }

    if (user_id) {
      filteredTasks = filteredTasks.filter(task => task.user_id === user_id);
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      const aValue = a[sort_by as keyof typeof a] as string;
      const bValue = b[sort_by as keyof typeof b] as string;
      
      if (sort_order === 'desc') {
        return bValue.localeCompare(aValue);
      } else {
        return aValue.localeCompare(bValue);
      }
    });

    // Apply pagination
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    // Calculate summary statistics
    const summary = {
      total_tasks: filteredTasks.length,
      completed: filteredTasks.filter(t => t.status === 'completed').length,
      running: filteredTasks.filter(t => t.status === 'running').length,
      failed: filteredTasks.filter(t => t.status === 'failed').length,
      avg_execution_time: filteredTasks
        .filter(t => t.execution_time)
        .reduce((sum, t) => sum + (t.execution_time || 0), 0) / 
        filteredTasks.filter(t => t.execution_time).length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        tasks: paginatedTasks,
        summary,
        pagination: {
          total: filteredTasks.length,
          limit,
          offset,
          has_more: offset + limit < filteredTasks.length
        }
      },
      message: 'Task history retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching task history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch task history',
        message: 'An error occurred while retrieving task history'
      },
      { status: 500 }
    );
  }
}

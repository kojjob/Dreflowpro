import { NextRequest, NextResponse } from 'next/server';

// Mock queue data
const mockQueueData = {
  high_priority: {
    name: 'High Priority Queue',
    current_size: 3,
    max_size: 100,
    processing_rate: 120, // tasks per hour
    avg_wait_time: 0.5, // minutes
    workers: {
      active: 5,
      total: 8,
      utilization: 62.5
    },
    tasks: [
      {
        id: 'task_hp_001',
        name: 'Critical Data Validation',
        type: 'data_validation',
        priority: 'high',
        estimated_duration: 2.5,
        queued_at: new Date(Date.now() - 30 * 1000).toISOString(),
        user_id: 'user_123'
      },
      {
        id: 'task_hp_002',
        name: 'Emergency Pipeline Execution',
        type: 'pipeline_execution',
        priority: 'high',
        estimated_duration: 4.2,
        queued_at: new Date(Date.now() - 45 * 1000).toISOString(),
        user_id: 'user_456'
      },
      {
        id: 'task_hp_003',
        name: 'Real-time Connector Sync',
        type: 'connector_sync',
        priority: 'high',
        estimated_duration: 1.8,
        queued_at: new Date(Date.now() - 60 * 1000).toISOString(),
        user_id: 'user_123'
      }
    ]
  },
  normal_priority: {
    name: 'Normal Priority Queue',
    current_size: 12,
    max_size: 500,
    processing_rate: 85, // tasks per hour
    avg_wait_time: 2.1, // minutes
    workers: {
      active: 8,
      total: 12,
      utilization: 66.7
    },
    tasks: [
      {
        id: 'task_np_001',
        name: 'Daily Report Generation',
        type: 'report_generation',
        priority: 'normal',
        estimated_duration: 8.5,
        queued_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        user_id: 'user_123'
      },
      {
        id: 'task_np_002',
        name: 'Customer Data Processing',
        type: 'data_processing',
        priority: 'normal',
        estimated_duration: 3.2,
        queued_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        user_id: 'user_456'
      }
      // ... more tasks would be here
    ]
  },
  low_priority: {
    name: 'Low Priority Queue',
    current_size: 28,
    max_size: 1000,
    processing_rate: 45, // tasks per hour
    avg_wait_time: 8.7, // minutes
    workers: {
      active: 3,
      total: 6,
      utilization: 50.0
    },
    tasks: [
      {
        id: 'task_lp_001',
        name: 'Archive Old Data',
        type: 'maintenance',
        priority: 'low',
        estimated_duration: 15.0,
        queued_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        user_id: 'system'
      },
      {
        id: 'task_lp_002',
        name: 'Cleanup Temporary Files',
        type: 'maintenance',
        priority: 'low',
        estimated_duration: 5.5,
        queued_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        user_id: 'system'
      }
      // ... more tasks would be here
    ]
  }
};

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority');
    const include_tasks = searchParams.get('include_tasks') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    let responseData: any = {};

    if (priority) {
      // Return specific priority queue
      const queueKey = `${priority}_priority` as keyof typeof mockQueueData;
      if (mockQueueData[queueKey]) {
        responseData = { [queueKey]: mockQueueData[queueKey] };
        
        // Limit tasks if requested
        if (include_tasks && responseData[queueKey].tasks) {
          responseData[queueKey].tasks = responseData[queueKey].tasks.slice(0, limit);
        } else if (!include_tasks) {
          delete responseData[queueKey].tasks;
        }
      }
    } else {
      // Return all queues
      responseData = { ...mockQueueData };
      
      // Handle task inclusion and limiting
      Object.keys(responseData).forEach(queueKey => {
        if (include_tasks && responseData[queueKey].tasks) {
          responseData[queueKey].tasks = responseData[queueKey].tasks.slice(0, limit);
        } else if (!include_tasks) {
          delete responseData[queueKey].tasks;
        }
      });
    }

    // Calculate summary statistics
    const summary = {
      total_queued_tasks: Object.values(mockQueueData).reduce((sum, queue) => sum + queue.current_size, 0),
      total_active_workers: Object.values(mockQueueData).reduce((sum, queue) => sum + queue.workers.active, 0),
      total_workers: Object.values(mockQueueData).reduce((sum, queue) => sum + queue.workers.total, 0),
      avg_utilization: Object.values(mockQueueData).reduce((sum, queue) => sum + queue.workers.utilization, 0) / Object.values(mockQueueData).length,
      estimated_total_wait_time: Object.values(mockQueueData).reduce((sum, queue) => sum + (queue.current_size * queue.avg_wait_time), 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        queues: responseData,
        summary,
        timestamp: new Date().toISOString()
      },
      message: 'Queue status retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch queue status',
        message: 'An error occurred while retrieving queue information'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

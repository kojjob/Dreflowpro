import { NextRequest, NextResponse } from 'next/server';

// Mock pipeline data
const mockPipelines = [
  {
    id: '1',
    name: 'Customer Data Pipeline',
    description: 'Processes customer data from multiple sources',
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    last_execution: '2024-01-20T14:45:00Z',
    execution_count: 156,
    success_rate: 98.7,
    transformations: ['JOIN', 'DEDUPLICATE', 'VALIDATE'],
    source_connectors: ['postgres-customers', 'api-orders'],
    destination_connectors: ['warehouse-analytics'],
    schedule: {
      type: 'cron',
      expression: '0 2 * * *',
      timezone: 'UTC'
    },
    metrics: {
      avg_execution_time: 2.34,
      records_processed: 10000,
      last_run_status: 'success'
    }
  },
  {
    id: '2',
    name: 'Sales Analytics ETL',
    description: 'Aggregates sales data for reporting dashboard',
    status: 'active',
    created_at: '2024-01-10T08:15:00Z',
    updated_at: '2024-01-20T16:20:00Z',
    last_execution: '2024-01-20T16:20:00Z',
    execution_count: 89,
    success_rate: 96.2,
    transformations: ['AGGREGATE', 'JOIN'],
    source_connectors: ['shopify-sales', 'stripe-payments'],
    destination_connectors: ['bigquery-analytics'],
    schedule: {
      type: 'interval',
      minutes: 30
    },
    metrics: {
      avg_execution_time: 1.82,
      records_processed: 5432,
      last_run_status: 'running'
    }
  },
  {
    id: '3',
    name: 'Product Catalog Sync',
    description: 'Synchronizes product information across platforms',
    status: 'active',
    created_at: '2024-01-12T12:00:00Z',
    updated_at: '2024-01-20T11:30:00Z',
    last_execution: '2024-01-20T11:30:00Z',
    execution_count: 234,
    success_rate: 99.1,
    transformations: ['VALIDATE', 'DEDUPLICATE'],
    source_connectors: ['inventory-system'],
    destination_connectors: ['ecommerce-platform', 'pos-system'],
    schedule: {
      type: 'cron',
      expression: '0 */6 * * *',
      timezone: 'UTC'
    },
    metrics: {
      avg_execution_time: 0.95,
      records_processed: 2150,
      last_run_status: 'success'
    }
  },
  {
    id: '4',
    name: 'Financial Reporting Pipeline',
    description: 'Processes financial data for compliance reporting',
    status: 'inactive',
    created_at: '2024-01-08T14:20:00Z',
    updated_at: '2024-01-18T09:15:00Z',
    last_execution: '2024-01-18T09:15:00Z',
    execution_count: 45,
    success_rate: 94.4,
    transformations: ['VALIDATE', 'AGGREGATE', 'JOIN'],
    source_connectors: ['accounting-system', 'bank-api'],
    destination_connectors: ['compliance-db'],
    schedule: {
      type: 'manual'
    },
    metrics: {
      avg_execution_time: 4.67,
      records_processed: 8750,
      last_run_status: 'success'
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredPipelines = mockPipelines;

    // Filter by status if provided
    if (status) {
      filteredPipelines = mockPipelines.filter(pipeline => pipeline.status === status);
    }

    // Apply pagination
    const paginatedPipelines = filteredPipelines.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        pipelines: paginatedPipelines,
        total: filteredPipelines.length,
        limit,
        offset,
        has_more: offset + limit < filteredPipelines.length
      },
      message: 'Pipelines retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pipelines',
        message: 'An error occurred while retrieving pipelines'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Create new pipeline with mock data
    const newPipeline = {
      id: String(mockPipelines.length + 1),
      name: body.name || 'New Pipeline',
      description: body.description || '',
      status: 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_execution: null,
      execution_count: 0,
      success_rate: 0,
      transformations: body.transformations || [],
      source_connectors: body.source_connectors || [],
      destination_connectors: body.destination_connectors || [],
      schedule: body.schedule || { type: 'manual' },
      metrics: {
        avg_execution_time: 0,
        records_processed: 0,
        last_run_status: 'never_run'
      }
    };

    // Add to mock data (in a real app, this would be saved to database)
    mockPipelines.push(newPipeline);

    return NextResponse.json({
      success: true,
      data: newPipeline,
      message: 'Pipeline created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create pipeline',
        message: 'An error occurred while creating the pipeline'
      },
      { status: 500 }
    );
  }
}

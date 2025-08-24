import { NextRequest, NextResponse } from 'next/server';
import Logger from '../../../utils/logger';

// Mock connector data
const mockConnectors = [
  {
    id: '1',
    name: 'Production PostgreSQL',
    description: 'Main production database for customer data',
    type: 'database',
    status: 'active',
    connection_config: {
      type: 'postgresql',
      host: 'prod-db.company.com',
      port: 5432,
      database: 'customers',
      username: 'etl_user',
      // password is not returned for security
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    last_tested: '2024-01-20T14:45:00Z',
    test_status: 'success',
    metadata: {
      tables_count: 15,
      last_sync: '2024-01-20T14:45:00Z',
      data_volume: '2.3GB'
    }
  },
  {
    id: '2',
    name: 'Shopify Store API',
    description: 'E-commerce platform integration for sales data',
    type: 'api',
    status: 'active',
    connection_config: {
      type: 'shopify',
      shop_domain: 'mystore.myshopify.com',
      api_version: '2023-10',
      // access_token is not returned for security
    },
    created_at: '2024-01-12T08:15:00Z',
    updated_at: '2024-01-20T16:20:00Z',
    last_tested: '2024-01-20T16:20:00Z',
    test_status: 'success',
    metadata: {
      endpoints_available: 8,
      last_sync: '2024-01-20T16:20:00Z',
      rate_limit: '40/second'
    }
  },
  {
    id: '3',
    name: 'Analytics Warehouse',
    description: 'Data warehouse for business intelligence',
    type: 'database',
    status: 'active',
    connection_config: {
      type: 'mysql',
      host: 'warehouse.analytics.com',
      port: 3306,
      database: 'analytics',
      username: 'warehouse_user',
    },
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-20T11:30:00Z',
    last_tested: '2024-01-20T11:30:00Z',
    test_status: 'success',
    metadata: {
      tables_count: 42,
      last_sync: '2024-01-20T11:30:00Z',
      data_volume: '15.7GB'
    }
  },
  {
    id: '4',
    name: 'Stripe Payments',
    description: 'Payment processing data connector',
    type: 'api',
    status: 'error',
    connection_config: {
      type: 'stripe',
      api_version: '2023-10-16',
      // secret_key is not returned for security
    },
    created_at: '2024-01-08T14:20:00Z',
    updated_at: '2024-01-19T09:15:00Z',
    last_tested: '2024-01-19T09:15:00Z',
    test_status: 'error',
    test_error: 'Authentication failed - API key may be expired',
    metadata: {
      endpoints_available: 12,
      last_sync: '2024-01-18T09:15:00Z',
      rate_limit: '100/second'
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredConnectors = mockConnectors;

    // Filter by status if provided
    if (status) {
      filteredConnectors = filteredConnectors.filter(connector => connector.status === status);
    }

    // Filter by type if provided
    if (type) {
      filteredConnectors = filteredConnectors.filter(connector => connector.type === type);
    }

    // Apply pagination
    const paginatedConnectors = filteredConnectors.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        connectors: paginatedConnectors,
        total: filteredConnectors.length,
        limit,
        offset,
        has_more: offset + limit < filteredConnectors.length
      },
      message: 'Connectors retrieved successfully'
    });

  } catch (error) {
    Logger.error('Error fetching connectors:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch connectors',
        message: 'An error occurred while retrieving connectors'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate required fields
    if (!body.name || !body.connection_config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Name and connection_config are required'
        },
        { status: 400 }
      );
    }

    // Create new connector with mock data
    const newConnector = {
      id: String(mockConnectors.length + 1),
      name: body.name,
      description: body.description || '',
      type: body.type || 'database',
      status: 'inactive',
      connection_config: {
        ...body.connection_config,
        // Remove sensitive data from response
        password: undefined,
        access_token: undefined,
        secret_key: undefined,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_tested: null,
      test_status: 'not_tested',
      metadata: {
        tables_count: 0,
        last_sync: null,
        data_volume: '0B'
      }
    };

    // Add to mock data (in a real app, this would be saved to database)
    mockConnectors.push(newConnector);

    return NextResponse.json({
      success: true,
      data: newConnector,
      message: 'Connector created successfully'
    }, { status: 201 });

  } catch (error) {
    Logger.error('Error creating connector:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create connector',
        message: 'An error occurred while creating the connector'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../services/api';
import Logger from '../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('📊 Reports API route called');

    // Extract query parameters and filter out undefined/null values
    const { searchParams } = new URL(request.url);
    const params: any = {};

    const reportType = searchParams.get('report_type');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (reportType && reportType !== 'undefined') params.report_type = reportType;
    if (status && status !== 'undefined') params.status = status;
    if (limit && limit !== 'undefined') params.limit = parseInt(limit);
    if (offset && offset !== 'undefined') params.offset = parseInt(offset);

    Logger.log('📊 Cleaned params:', params);

    // Use the main API service which handles fallback to mock data
    const result = await apiService.getReports(params);

    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch reports:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    Logger.log('📊 Create report API route called');
    
    const body = await request.json();
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.createReport(body);
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to create report:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create report' 
      },
      { status: 500 }
    );
  }
}

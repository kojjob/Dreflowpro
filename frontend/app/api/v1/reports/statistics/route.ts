import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('📊 Reports statistics API route called');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Use the main API service which handles fallback to mock data
    const result = await apiService.getReportStatistics(days);
    
    Logger.log('📊 Statistics result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch report statistics:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch report statistics' 
      },
      { status: 500 }
    );
  }
}

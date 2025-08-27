import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('📊 Get dashboard quick stats API route called');
    
    // Get real-time stats from backend
    const result = await apiService.get('/api/v1/dashboard/quick-stats');
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch dashboard quick stats:', error);
    
    // Return error response instead of mock data
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics' 
      },
      { status: 500 }
    );
  }
}
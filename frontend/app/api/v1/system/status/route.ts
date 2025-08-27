import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('🏥 Get system status API route called');
    
    // Get real system status from backend
    const result = await apiService.get('/api/v1/system/status');
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch system status:', error);
    
    // Return error response instead of mock data
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch system status' 
      },
      { status: 500 }
    );
  }
}
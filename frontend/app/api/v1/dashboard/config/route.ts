import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('⚙️ Get dashboard config API route called');
    
    // Use the getDashboardConfig method which has proper fallback
    const result = await apiService.getDashboardConfig();
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch dashboard config:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard configuration' 
      },
      { status: 500 }
    );
  }
}
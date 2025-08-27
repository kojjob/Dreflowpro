import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(request: NextRequest) {
  try {
    Logger.log('⚙️ Get report config API route called');
    
    // Use the getReportConfig method which has proper fallback
    const result = await apiService.getReportConfig();
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error('Failed to fetch report config:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch report configuration' 
      },
      { status: 500 }
    );
  }
}
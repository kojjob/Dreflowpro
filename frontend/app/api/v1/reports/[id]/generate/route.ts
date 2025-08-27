import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../../services/api';
import Logger from '../../../../../utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    Logger.log(`📊 Generate report API route called for ID: ${params.id}`);
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.generateReport(params.id);
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error(`Failed to generate report ${params.id}:`, error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate report' 
      },
      { status: 500 }
    );
  }
}

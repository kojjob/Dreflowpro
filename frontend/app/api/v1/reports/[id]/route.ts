import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    Logger.log(`📊 Get report API route called for ID: ${params.id}`);
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.get(`/api/v1/reports/${params.id}`);
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error(`Failed to fetch report ${params.id}:`, error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch report' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    Logger.log(`📊 Delete report API route called for ID: ${params.id}`);
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.deleteReport(params.id);
    
    return NextResponse.json(result);
  } catch (error) {
    Logger.error(`Failed to delete report ${params.id}:`, error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete report' 
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiService } from '../../../../services/api';
import Logger from '../../../../utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    Logger.log(`📊 Get report API route called for ID: ${id}`);
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.get(`/api/v1/reports/${id}`);
    
    return NextResponse.json(result);
  } catch (error) {
    const { id } = await params;
    Logger.error(`Failed to fetch report ${id}:`, error);
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    Logger.log(`📊 Delete report API route called for ID: ${id}`);
    
    // Use the main API service which handles fallback to mock data
    const result = await apiService.deleteReport(id);
    
    return NextResponse.json(result);
  } catch (error) {
    const { id } = await params;
    Logger.error(`Failed to delete report ${id}:`, error);
    
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

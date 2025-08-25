import { apiService } from './api';

export interface Report {
  id: string;
  title: string;
  description?: string;
  report_type: 'EXECUTIVE' | 'ANALYST' | 'PRESENTATION' | 'DASHBOARD_EXPORT';
  format: 'PDF' | 'EXCEL' | 'POWERPOINT' | 'CSV' | 'JSON';
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  user_id: string;
  organization_id: string;
  dataset_id?: string;
  pipeline_id?: string;
  template_id?: string;
  generation_config?: Record<string, any>;
  generation_results?: Record<string, any>;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  download_count: number;
  view_count: number;
  shared_with?: string[];
  is_scheduled: boolean;
  schedule_config?: Record<string, any>;
  expires_at?: string;
  task_id?: string;
  error_message?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  report_type: 'EXECUTIVE' | 'ANALYST' | 'PRESENTATION' | 'DASHBOARD_EXPORT';
  template_config: Record<string, any>;
  is_default: boolean;
  is_active: boolean;
  user_id?: string;
  organization_id?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportListParams {
  report_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ReportListResponse {
  success: boolean;
  data: {
    reports: Report[];
    total_count: number;
    page_size: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ReportStatistics {
  period_days: number;
  total_reports: number;
  completed_reports: number;
  pending_reports: number;
  failed_reports: number;
  total_downloads: number;
  reports_by_status: Record<string, number>;
  reports_by_type: Record<string, number>;
  recent_reports: Report[];
}

export interface CreateReportParams {
  title: string;
  description?: string;
  report_type: 'EXECUTIVE' | 'ANALYST' | 'PRESENTATION' | 'DASHBOARD_EXPORT';
  format: 'PDF' | 'EXCEL' | 'POWERPOINT' | 'CSV' | 'JSON';
  dataset_id?: string;
  pipeline_id?: string;
  generation_config?: Record<string, any>;
  schedule_config?: Record<string, any>;
  generate_immediately?: boolean;
}

export interface BatchReportRequest {
  title?: string;
  description?: string;
  report_type?: string;
  format?: string;
  dataset_id?: string;
  pipeline_id?: string;
  generation_config?: Record<string, any>;
}

export const reportsApi = {
  // List reports with optional filters
  async listReports(params: ReportListParams = {}): Promise<ReportListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.report_type) queryParams.append('report_type', params.report_type);
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    const url = `/api/v1/reports${query ? `?${query}` : ''}`;
    
    return apiService.get(url);
  },

  // Get report statistics for dashboard
  async getReportStatistics(days: number = 30): Promise<{ success: boolean; data: ReportStatistics }> {
    return apiService.get(`/api/v1/reports/statistics`, { days: days.toString() });
  },

  // Get specific report by ID
  async getReport(reportId: string): Promise<{ success: boolean; data: Report }> {
    return apiService.get(`/api/v1/reports/${reportId}`);
  },

  // Create new report
  async createReport(params: CreateReportParams): Promise<{ success: boolean; data: any }> {
    return apiService.post('/api/v1/reports', params);
  },

  // Generate existing report
  async generateReport(reportId: string): Promise<{ success: boolean; data: any }> {
    return apiService.post(`/api/v1/reports/${reportId}/generate`);
  },

  // Download report file
  async downloadReport(reportId: string): Promise<Blob> {
    const response = await fetch(`/api/v1/reports/${reportId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  },

  // Delete report
  async deleteReport(reportId: string): Promise<{ success: boolean; message: string }> {
    return apiService.delete(`/api/v1/reports/${reportId}`);
  },

  // Share report with users
  async shareReport(reportId: string, sharedWith: string[]): Promise<{ success: boolean; message: string; data: { shared_with: string[] } }> {
    return apiService.post(`/api/v1/reports/${reportId}/share`, { shared_with: sharedWith });
  },

  // Batch generate reports
  async batchGenerateReports(requests: BatchReportRequest[]): Promise<{ success: boolean; data: any }> {
    return apiService.post('/api/v1/reports/batch', { report_requests: requests });
  },

  // Clean up expired reports (admin only)
  async cleanupExpiredReports(): Promise<{ success: boolean; data: { cleaned_count: number; failed_count: number; total_expired: number } }> {
    return apiService.post('/api/v1/reports/cleanup');
  }
};
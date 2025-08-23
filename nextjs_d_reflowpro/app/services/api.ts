/**
 * API Service
 * Centralized API communication service with dynamic configuration
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/dataConfig';

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Get authentication headers for form data
   */
  private getFormAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Create full URL
   */
  private createUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return url.toString();
  }

  /**
   * Generic fetch wrapper with timeout and error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.createUrl(endpoint, params);
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    return response.json();
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.createUrl(endpoint);
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.createUrl(endpoint);
    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.createUrl(endpoint);
    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    return response.json();
  }

  /**
   * Form data upload
   */
  async uploadForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.createUrl(endpoint);
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: this.getFormAuthHeaders(),
      body: formData,
    });
    
    return response.json();
  }

  // Data API methods
  async uploadFile(file: File, previewRows: number = 100): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview_rows', previewRows.toString());
    
    return this.uploadForm(API_ENDPOINTS.data.upload, formData);
  }

  async getFileInfo(fileId: string): Promise<any> {
    return this.get(API_ENDPOINTS.data.info(fileId));
  }

  async previewFile(fileId: string, rows: number = 50): Promise<any> {
    return this.get(API_ENDPOINTS.data.preview(fileId), { rows: rows.toString() });
  }

  async analyzeFile(fileId: string, previewRows: number = 100): Promise<any> {
    return this.post(API_ENDPOINTS.data.analyze(fileId), { preview_rows: previewRows });
  }

  async transformFile(fileId: string, transformationConfig: any): Promise<any> {
    return this.post(API_ENDPOINTS.data.transform(fileId), transformationConfig);
  }

  async deleteFile(fileId: string): Promise<any> {
    return this.delete(API_ENDPOINTS.data.delete(fileId));
  }

  async getSupportedFormats(): Promise<any> {
    return this.get(API_ENDPOINTS.data.supportedFormats);
  }

  // Configuration API methods
  async getUploadConfig(): Promise<any> {
    return this.get(API_ENDPOINTS.config.upload);
  }

  async getTransformationOptions(): Promise<any> {
    return this.get(API_ENDPOINTS.config.transformations);
  }

  async getUserPreferences(): Promise<any> {
    return this.get(API_ENDPOINTS.config.userPreferences);
  }

  async updateUserPreferences(preferences: any): Promise<any> {
    return this.put(API_ENDPOINTS.config.userPreferences, preferences);
  }

  /**
   * Update base URL (useful for environment switching)
   */
  updateBaseUrl(newBaseUrl: string): void {
    this.baseUrl = newBaseUrl;
  }

  /**
   * Update timeout
   */
  updateTimeout(newTimeout: number): void {
    this.timeout = newTimeout;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    localStorage.removeItem('access_token');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

// Type definitions
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface FileUploadResponse {
  success: boolean;
  file_id: string;
  file_info: {
    filename: string;
    file_type: string;
    file_size: number;
    upload_time: string;
  };
  data_analysis: {
    basic_stats: any;
    column_analysis: any[];
    data_quality: any;
    visualizations: any;
  };
  message: string;
}

export interface FilePreviewResponse {
  success: boolean;
  file_id: string;
  file_info: any;
  data_info: any;
  preview_data: any[];
  total_rows: number;
}

export interface TransformationResponse {
  success: boolean;
  file_id: string;
  transformation: string;
  result: any;
  comparison: any;
  transformed_data: any[];
}
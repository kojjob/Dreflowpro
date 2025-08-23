/**
 * API Service
 * Centralized API communication service with dynamic configuration and automatic token refresh
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/dataConfig';
import { authService } from './auth';

interface QueuedRequest {
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  url: string;
  options: RequestInit;
}

class ApiService {
  private baseUrl: string;
  private timeout: number;
  private isRefreshing: boolean = false;
  private requestQueue: QueuedRequest[] = [];

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
  }

  /**
   * Get authentication headers with automatic token refresh
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    try {
      const token = await authService.getValidAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get valid access token:', error);
    }
    
    return headers;
  }

  /**
   * Get authentication headers for form data with automatic token refresh
   */
  private async getFormAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    try {
      const token = await authService.getValidAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get valid access token for form upload:', error);
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
   * Process queued requests after token refresh
   */
  private processRequestQueue(): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    queue.forEach(({ resolve, reject, url, options }) => {
      this.fetchWithTimeout(url, options)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Queue request during token refresh
   */
  private queueRequest(url: string, options: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, url, options });
    });
  }

  /**
   * Generic fetch wrapper with timeout, error handling, and automatic token refresh
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

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401) {
        // If already refreshing, queue this request
        if (this.isRefreshing) {
          return this.queueRequest(url, options);
        }

        // Attempt token refresh
        this.isRefreshing = true;
        try {
          await authService.refreshAccessToken();
          
          // Retry original request with new token
          const newHeaders = await this.getAuthHeaders();
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              ...newHeaders,
            },
            signal: controller.signal,
          });

          // Process queued requests
          this.processRequestQueue();
          
          if (!retryResponse.ok && retryResponse.status !== 401) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${retryResponse.status}`);
          }

          return retryResponse;
        } catch (refreshError) {
          // Token refresh failed, redirect to login
          console.error('Token refresh failed:', refreshError);
          authService.logout();
          
          // Reject all queued requests
          const queue = [...this.requestQueue];
          this.requestQueue = [];
          queue.forEach(({ reject }) => {
            reject(new Error('Authentication failed'));
          });
          
          throw new Error('Authentication failed');
        } finally {
          this.isRefreshing = false;
        }
      }

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
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });
    
    return response.json();
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.createUrl(endpoint);
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.createUrl(endpoint);
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    return response.json();
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const url = this.createUrl(endpoint);
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'DELETE',
      headers,
    });
    
    return response.json();
  }

  /**
   * Form data upload
   */
  async uploadForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.createUrl(endpoint);
    const headers = await this.getFormAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers,
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
    return authService.isAuthenticated();
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    authService.logout();
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
/**
 * API Service
 * Centralized API communication service with dynamic configuration and automatic token refresh
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/dataConfig';
import { tokenManager } from '../utils/tokenManager';
import Logger from '../utils/logger';


class ApiService {
  private baseUrl: string;
  private timeout: number;
  private suppressExpectedErrors: boolean;
  private isApiAvailable: boolean = false;
  private lastApiCheck: number = 0;
  private apiCheckInterval: number = 30000; // Check every 30 seconds

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
    this.suppressExpectedErrors = process.env.NODE_ENV === 'development';
    this.checkApiAvailability();
  }

  /**
   * Ensure error is a proper Error instance with string message
   */
  private ensureError(error: any, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    } else {
      let errorMessage = fallbackMessage;

      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = typeof error.message === 'string'
            ? error.message
            : JSON.stringify(error.message);
        } else if ('detail' in error) {
          errorMessage = typeof error.detail === 'string'
            ? error.detail
            : JSON.stringify(error.detail);
        } else if ('error' in error) {
          errorMessage = typeof error.error === 'string'
            ? error.error
            : JSON.stringify(error.error);
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else {
        errorMessage = String(error) || fallbackMessage;
      }

      return new Error(errorMessage);
    }
  }

  /**
   * Check if the API is available
   */
  private async checkApiAvailability(): Promise<boolean> {
    const now = Date.now();

    // Only check if it's been more than the interval since last check
    if (now - this.lastApiCheck < this.apiCheckInterval) {
      return this.isApiAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      this.isApiAvailable = response.ok;
      this.lastApiCheck = now;

      if (this.isApiAvailable) {
        Logger.log('✅ API is available');
      } else {
        Logger.warn('⚠️ API responded but not healthy, using mock data');
      }

      return this.isApiAvailable;
    } catch (error) {
      this.isApiAvailable = false;
      this.lastApiCheck = now;
      
      // Better error categorization
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED');
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('aborted');
      
      if (isTimeoutError) {
        Logger.warn('⏱️ API timeout, using mock data');
      } else if (isNetworkError) {
        Logger.warn('🌐 Network error, using mock data');
      } else {
        Logger.warn('⚠️ API not available, using mock data:', errorMessage);
      }
      
      return false;
    }
  }

  /**
   * Get authentication headers with automatic token refresh
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Use tokenManager for authentication headers
      return tokenManager.getAuthHeaders();
    } catch (error) {
      Logger.warn('Failed to get auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  }

  /**
   * Get authentication headers for form data with automatic token refresh
   */
  private async getFormAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    
    try {
      // For development, skip token authentication since we're using mock data
      // In production, this would get tokens from AuthContext via a different mechanism
      Logger.log('🔐 Skipping form token authentication for development mock data');
      
      // Uncomment below for production with real authentication
      // const token = await authService.getValidAccessToken();
      // if (token) {
      //   headers['Authorization'] = `Bearer ${token}`;
      // }
    } catch (error) {
      Logger.warn('Failed to get valid access token for form upload:', error);
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

      // Handle 401 Unauthorized - let AuthContext handle token refresh
      if (response.status === 401) {
        Logger.warn('Received 401 Unauthorized - authentication required');
        throw new Error('Authentication failed. Please try again.');
      }

      if (!response.ok) {
        // Handle different error types more gracefully
        if (response.status === 404) {
          // In development, 404s are expected when backends aren't running
          if (!this.suppressExpectedErrors) {
            Logger.warn(`API endpoint not found: ${url}`);
          }
          throw new Error('API endpoint not available');
        }
        
        const errorData = await response.json().catch(() => ({}));

        // Extract error message more safely - prioritize human-readable messages
        let errorMessage = `HTTP error! status: ${response.status}`;

        // First, try to get a human-readable message
        if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.detail && typeof errorData.detail === 'object' && errorData.detail.message) {
          // Handle nested error objects in detail field
          errorMessage = typeof errorData.detail.message === 'string'
            ? errorData.detail.message
            : JSON.stringify(errorData.detail.message);
        } else if (errorData.message) {
          // If message exists but is not a string, try to extract meaningful info
          errorMessage = JSON.stringify(errorData.message);
        } else if (Object.keys(errorData).length > 0) {
          // If we have error data but no clear message, create a readable summary
          const errorSummary = [];

          if (errorData.error) {
            const errorValue = typeof errorData.error === 'string'
              ? errorData.error
              : JSON.stringify(errorData.error);
            errorSummary.push(`Error: ${errorValue}`);
          }

          if (errorData.message) {
            const messageValue = typeof errorData.message === 'string'
              ? errorData.message
              : JSON.stringify(errorData.message);
            errorSummary.push(`Message: ${messageValue}`);
          }

          if (errorData.detail) {
            let detailValue;
            if (typeof errorData.detail === 'string') {
              detailValue = errorData.detail;
            } else if (typeof errorData.detail === 'object' && errorData.detail.message) {
              // Extract message from nested error object
              detailValue = typeof errorData.detail.message === 'string'
                ? errorData.detail.message
                : JSON.stringify(errorData.detail.message);
            } else {
              detailValue = JSON.stringify(errorData.detail);
            }
            errorSummary.push(`Detail: ${detailValue}`);
          }

          if (errorSummary.length > 0) {
            errorMessage = errorSummary.join(', ');
          } else {
            errorMessage = `HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`;
          }
        }

        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // Ensure we always throw a proper Error with a string message
      if (error instanceof Error) {
        throw error;
      } else {
        const errorMessage = error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : String(error) || 'Unknown error occurred';
        throw new Error(errorMessage);
      }
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
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.createUrl(endpoint);
    const headers = await this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
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
   * @deprecated Use AuthContext instead
   */
  isAuthenticated(): boolean {
    // For development, assume authenticated since we're using mock data
    Logger.log('🔐 Using mock authentication status for development');
    return true;
    
    // In production, this should be handled by AuthContext
    // return authService.isAuthenticated();
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    // Use tokenManager to clear tokens instead of disabled authService
    tokenManager.clearTokens();
  }

  // ========================================
  // AUTHENTICATION API METHODS
  // ========================================

  async register(userData: any): Promise<any> {
    try {
      Logger.log('📝 Attempting registration via Next.js API route');
      // Use absolute URL for Next.js API routes to avoid baseUrl confusion
      const response = await this.fetchWithTimeout('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      Logger.log('✅ Registration successful');
      return data;
    } catch (error) {
      Logger.error('Registration failed:', error);
      throw this.ensureError(error, 'Registration failed');
    }
  }

  async login(credentials: any): Promise<any> {
    try {
      Logger.log('🔐 Attempting login via Next.js API route');
      // Use absolute URL for Next.js API routes to avoid baseUrl confusion
      const response = await this.fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      Logger.log('✅ Login successful');
      return data;
    } catch (error) {
      Logger.error('Login failed:', error);
      throw this.ensureError(error, 'Login failed');
    }
  }

  async refreshToken(refreshToken: string): Promise<any> {
    return this.post(API_ENDPOINTS.auth.refresh, { refresh_token: refreshToken });
  }

  async logout(): Promise<any> {
    return this.post(API_ENDPOINTS.auth.logout);
  }

  async getCurrentUser(): Promise<any> {
    try {
      Logger.log('👤 Fetching user via Next.js API route');
      // Use absolute URL for Next.js API routes to avoid baseUrl confusion
      const response = await this.fetchWithTimeout('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user' }));
        throw new Error(errorData.message || 'Failed to fetch user');
      }

      const user = await response.json();
      Logger.log('✅ User fetched successfully');
      return user;
    } catch (error) {
      Logger.error('Failed to fetch user:', error);
      throw this.ensureError(error, 'Failed to fetch user');
    }
  }

  async updateUserProfile(profileData: any): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        throw new Error('API is not available');
      }
      return this.put(API_ENDPOINTS.auth.me, profileData);
    } catch (error) {
      Logger.error('Failed to update user profile via API:', error);
      throw this.ensureError(error, 'Failed to update user profile');
    }
  }

  async changePassword(passwordData: any): Promise<any> {
    return this.post('/api/v1/auth/change-password', passwordData);
  }

  // NOTIFICATIONS API METHODS
  // ========================================

  async getNotifications(params?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.unreadOnly) queryParams.append('unread_only', 'true');

    const url = `/api/v1/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.get(url);
  }

  async getNotificationSummary(): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        throw new Error('API is not available');
      }
      return this.get('/api/v1/notifications/summary');
    } catch (error) {
      Logger.error('Failed to fetch notification summary from API:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<any> {
    return this.patch(`/api/v1/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<any> {
    return this.post('/api/v1/notifications/mark-all-read');
  }

  async deleteNotification(notificationId: string): Promise<any> {
    return this.delete(`/api/v1/notifications/${notificationId}`);
  }

  async getNotificationSettings(): Promise<any> {
    return this.get('/api/v1/notifications/settings');
  }

  async updateNotificationSettings(settings: any): Promise<any> {
    return this.put('/api/v1/notifications/settings', settings);
  }

  async verifyEmail(token: string): Promise<any> {
    return this.post(API_ENDPOINTS.auth.verifyEmail(token));
  }

  async requestPasswordReset(email: string): Promise<any> {
    return this.post(API_ENDPOINTS.auth.requestPasswordReset, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    return this.post(API_ENDPOINTS.auth.resetPassword(token), { new_password: newPassword });
  }

  // API Keys management
  async getApiKeys(): Promise<any> {
    return this.get(API_ENDPOINTS.auth.apiKeys.list);
  }

  async createApiKey(keyData: any): Promise<any> {
    return this.post(API_ENDPOINTS.auth.apiKeys.create, keyData);
  }

  async revokeApiKey(keyId: string): Promise<any> {
    return this.delete(API_ENDPOINTS.auth.apiKeys.revoke(keyId));
  }

  async toggleApiKey(keyId: string): Promise<any> {
    return this.put(API_ENDPOINTS.auth.apiKeys.toggle(keyId));
  }

  // OAuth methods
  async getOAuthLoginUrl(provider: string, redirectUri?: string): Promise<any> {
    const params = redirectUri ? { redirect_uri: redirectUri } : undefined;
    return this.get(API_ENDPOINTS.auth.oauth.login(provider), params);
  }

  // ========================================
  // PIPELINE API METHODS
  // ========================================

  async getPipelines(): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🔧 Using mock pipelines data');
        return await mockApiService.getPipelines();
      }
      return this.get(API_ENDPOINTS.pipelines.list);
    } catch (error) {
      Logger.warn('Failed to fetch pipelines from API, using mock data:', error);
      return await mockApiService.getPipelines();
    }
  }

  async createPipeline(pipelineData: any): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🔧 Using mock pipeline creation');
        return await mockApiService.createPipeline(pipelineData);
      }
      return this.post(API_ENDPOINTS.pipelines.create, pipelineData);
    } catch (error) {
      Logger.warn('Failed to create pipeline via API, using mock creation:', error);
      return await mockApiService.createPipeline(pipelineData);
    }
  }

  async getPipeline(pipelineId: string): Promise<any> {
    return this.get(API_ENDPOINTS.pipelines.get(pipelineId));
  }

  async updatePipeline(pipelineId: string, pipelineData: any): Promise<any> {
    return this.put(API_ENDPOINTS.pipelines.update(pipelineId), pipelineData);
  }

  async deletePipeline(pipelineId: string): Promise<any> {
    return this.delete(API_ENDPOINTS.pipelines.delete(pipelineId));
  }

  async executePipeline(pipelineId: string, executionParams?: any): Promise<any> {
    return this.post(API_ENDPOINTS.pipelines.execute(pipelineId), executionParams);
  }

  async getPipelineExecutions(pipelineId: string): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🔧 Using mock pipeline executions data');
        return await mockApiService.getPipelineExecutions(pipelineId);
      }
      return this.get(API_ENDPOINTS.pipelines.executions(pipelineId));
    } catch (error) {
      Logger.warn('Failed to fetch pipeline executions from API, using mock data:', error);
      return await mockApiService.getPipelineExecutions(pipelineId);
    }
  }

  async cancelExecution(pipelineId: string, executionId: string): Promise<any> {
    return this.post(API_ENDPOINTS.pipelines.cancel(pipelineId, executionId));
  }

  // ========================================
  // CONNECTOR API METHODS
  // ========================================

  async getConnectors(): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🔌 Using mock connectors data');
        return await mockApiService.getConnectors();
      }
      return this.get(API_ENDPOINTS.connectors.list);
    } catch (error) {
      Logger.warn('Failed to fetch connectors from API, using mock data:', error);
      return await mockApiService.getConnectors();
    }
  }

  async createConnector(connectorData: any): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🔌 Using mock connector creation');
        return await mockApiService.createConnector(connectorData);
      }
      return this.post(API_ENDPOINTS.connectors.create, connectorData);
    } catch (error) {
      Logger.warn('Failed to create connector via API, using mock creation:', error);
      return await mockApiService.createConnector(connectorData);
    }
  }

  async getConnector(connectorId: string): Promise<any> {
    return this.get(API_ENDPOINTS.connectors.get(connectorId));
  }

  async updateConnector(connectorId: string, connectorData: any): Promise<any> {
    return this.put(API_ENDPOINTS.connectors.update(connectorId), connectorData);
  }

  async deleteConnector(connectorId: string): Promise<any> {
    return this.delete(API_ENDPOINTS.connectors.delete(connectorId));
  }

  async testConnector(connectorId: string): Promise<any> {
    return this.post(API_ENDPOINTS.connectors.test(connectorId));
  }

  async previewConnectorData(connectorId: string, limit?: number): Promise<any> {
    const params = limit ? { limit: limit.toString() } : undefined;
    return this.get(API_ENDPOINTS.connectors.preview(connectorId), params);
  }

  // ========================================
  // BACKGROUND TASKS API METHODS
  // ========================================

  async getTasksStatus(): Promise<any> {
    return this.get(API_ENDPOINTS.tasks.status);
  }

  async getTaskQueue(): Promise<any> {
    return this.get(API_ENDPOINTS.tasks.queue);
  }

  async getTaskHistory(params?: { limit?: number; offset?: number; status?: string }): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.offset) queryParams.offset = params.offset.toString();
    if (params?.status) queryParams.status_filter = params.status;
    
    return this.get(API_ENDPOINTS.tasks.history, queryParams);
  }

  async getTaskMetrics(): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('📊 Using mock task metrics data');
        return await mockApiService.getTaskMetrics();
      }
      return this.get(API_ENDPOINTS.tasks.metrics);
    } catch (error) {
      Logger.warn('Failed to fetch task metrics from API, using mock data:', error);
      return await mockApiService.getTaskMetrics();
    }
  }

  async executeTask(taskType: 'pipeline' | 'dataProcessing' | 'reportGeneration' | 'maintenance' | 'notification', taskData: any): Promise<any> {
    const endpoint = API_ENDPOINTS.tasks.execute[taskType];
    return this.post(endpoint, taskData);
  }

  async cancelTask(taskId: string): Promise<any> {
    return this.post(API_ENDPOINTS.tasks.cancel(taskId));
  }

  async retryTask(taskId: string): Promise<any> {
    return this.post(API_ENDPOINTS.tasks.retry(taskId));
  }

  async getTask(taskId: string): Promise<any> {
    return this.get(API_ENDPOINTS.tasks.get(taskId));
  }

  async getTaskLogs(taskId: string): Promise<any> {
    return this.get(API_ENDPOINTS.tasks.logs(taskId));
  }

  // ========================================
  // HEALTH CHECK METHOD
  // ========================================

  async getHealthStatus(): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('🏥 Using mock health status data');
        return await mockApiService.getHealthStatus();
      }
      return this.get(API_ENDPOINTS.health);
    } catch (error) {
      Logger.warn('Failed to fetch health status from API, using mock data:', error);
      return await mockApiService.getHealthStatus();
    }
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
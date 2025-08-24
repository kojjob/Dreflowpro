/**
 * API Service
 * Centralized API communication service with dynamic configuration and automatic token refresh
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/dataConfig';
import { authService } from './auth';
import { mockApiService } from './mockApi';
import Logger from '../utils/logger';

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
  private isApiAvailable: boolean = false;
  private lastApiCheck: number = 0;
  private apiCheckInterval: number = 30000; // Check every 30 seconds

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.timeout = API_CONFIG.timeout;
    this.checkApiAvailability();
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
      Logger.warn('⚠️ API not available, using mock data:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get authentication headers with automatic token refresh
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    try {
      // For development, skip token authentication since we're using mock data
      // In production, this would get tokens from AuthContext via a different mechanism
      Logger.log('🔐 Skipping token authentication for development mock data');
      
      // Uncomment below for production with real authentication
      // const token = await authService.getValidAccessToken();
      // if (token) {
      //   headers['Authorization'] = `Bearer ${token}`;
      // }
    } catch (error) {
      Logger.warn('Failed to get valid access token:', error);
    }
    
    return headers;
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
          Logger.error('Token refresh failed:', refreshError);

          // Determine if this is a session expiry or other error
          const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
          const isSessionExpired = errorMessage.includes('Token refresh failed') ||
                                   errorMessage.includes('Invalid refresh token') ||
                                   errorMessage.includes('No refresh token available') ||
                                   errorMessage.includes('Invalid token received from refresh');

          if (isSessionExpired) {
            Logger.log('Session expired, logging out user');
            authService.logout();

            // Reject all queued requests with session expired message
            const queue = [...this.requestQueue];
            this.requestQueue = [];
            queue.forEach(({ reject }) => {
              reject(new Error('Session expired. Please log in again.'));
            });

            throw new Error('Session expired. Please log in again.');
          } else {
            // Other refresh errors - don't logout immediately
            Logger.warn('Token refresh failed but not due to expiry:', refreshError);

            // Reject all queued requests
            const queue = [...this.requestQueue];
            this.requestQueue = [];
            queue.forEach(({ reject }) => {
              reject(new Error('Authentication failed. Please try again.'));
            });

            throw new Error('Authentication failed. Please try again.');
          }
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
    authService.logout();
  }

  // ========================================
  // AUTHENTICATION API METHODS
  // ========================================

  async register(userData: any): Promise<any> {
    return this.post(API_ENDPOINTS.auth.register, userData);
  }

  async login(credentials: any): Promise<any> {
    try {
      // For development, use mock login to avoid API dependency issues
      Logger.log('🔐 Using mock login for development');
      
      // Simulate successful login with mock tokens
      return {
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        user: await mockApiService.getCurrentUser()
      };

      // Uncomment below for production API usage
      // const isAvailable = await this.checkApiAvailability();
      // if (!isAvailable) {
      //   Logger.log('🔐 API unavailable, using mock login');
      //   return {
      //     access_token: 'mock_access_token_' + Date.now(),
      //     refresh_token: 'mock_refresh_token_' + Date.now(),
      //     token_type: 'Bearer',
      //     expires_in: 3600,
      //     user: await mockApiService.getCurrentUser()
      //   };
      // }
      // return this.post(API_ENDPOINTS.auth.login, credentials);
    } catch (error) {
      Logger.warn('Login failed, using mock login:', error);
      return {
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        user: await mockApiService.getCurrentUser()
      };
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
      // For development, always use mock data to avoid loading issues
      Logger.log('👤 Using mock user data for development');
      return mockApiService.getCurrentUser();

      // Uncomment below for production API usage
      // const isAvailable = await this.checkApiAvailability();
      // if (!isAvailable) {
      //   Logger.log('👤 Using mock user data');
      //   return mockApiService.getCurrentUser();
      // }
      // return this.get(API_ENDPOINTS.auth.me);
    } catch (error) {
      Logger.warn('Failed to fetch user from API, using mock data:', error);
      return mockApiService.getCurrentUser();
    }
  }

  async updateUserProfile(profileData: any): Promise<any> {
    try {
      const isAvailable = await this.checkApiAvailability();
      if (!isAvailable) {
        Logger.log('👤 Using mock user profile update');
        return mockApiService.updateUserProfile(profileData);
      }
      return this.put(API_ENDPOINTS.auth.me, profileData);
    } catch (error) {
      Logger.warn('Failed to update user profile via API, using mock data:', error);
      return mockApiService.updateUserProfile(profileData);
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
        Logger.log('🔔 Using mock notification summary');
        return mockApiService.getNotificationSummary();
      }
      return this.get('/api/v1/notifications/summary');
    } catch (error) {
      Logger.warn('Failed to fetch notification summary from API, using mock data:', error);
      return mockApiService.getNotificationSummary();
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
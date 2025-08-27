import { tokenManager } from '../utils/tokenManager';
import Logger from '../utils/logger';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  [key: string]: any;
}

export interface ReportProgressMessage extends WebSocketMessage {
  type: 'report_progress';
  report_id: string;
  progress: number;
  current_step: string;
  estimated_time?: number;
}

export interface ReportStatusMessage extends WebSocketMessage {
  type: 'report_status';
  report_id: string;
  status: string;
  progress: number;
  details?: Record<string, any>;
}

export interface ReportCompletedMessage extends WebSocketMessage {
  type: 'report_completed';
  report_id: string;
  file_info?: Record<string, any>;
  download_url?: string;
  message: string;
}

export type ReportWebSocketMessage = 
  | ReportProgressMessage 
  | ReportStatusMessage 
  | ReportCompletedMessage;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private url: string;
  private token: string | null = null;
  private messageHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/api/v1/streaming/ws`;
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Get auth token using token manager
        const tokenData = tokenManager.getStoredToken();
        if (!tokenData?.access_token) {
          Logger.warn('🔌 No authentication token found for WebSocket connection');
          reject(new Error('No authentication token found'));
          return;
        }

        // Check if token is expired
        if (!tokenManager.isTokenValid(tokenData)) {
          Logger.warn('🔌 Authentication token is expired for WebSocket connection');
          reject(new Error('Authentication token is expired'));
          return;
        }

        this.token = tokenData.access_token;
        Logger.log('🔌 Connecting to WebSocket with valid token');

        // Create WebSocket connection with auth token
        const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          Logger.log('🔌 WebSocket connected successfully');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            Logger.error('🔌 Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          Logger.warn('🔌 WebSocket disconnected:', event.code, event.reason);
          this.connectionPromise = null;
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };

        this.ws.onerror = (error) => {
          Logger.error('🔌 WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error: any) {
        Logger.error('🔌 Failed to create WebSocket connection:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('WebSocket reconnection failed:', error);
      });
    }, delay);
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }

    // Also call handlers for 'all' type
    const allHandlers = this.messageHandlers.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(message));
    }
  }

  subscribe(messageType: string, handler: (message: WebSocketMessage) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    
    const handlers = this.messageHandlers.get(messageType)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  subscribeToReportProgress(reportId: string, handler: (message: ReportProgressMessage) => void): () => void {
    return this.subscribe('report_progress', (message) => {
      const progressMessage = message as ReportProgressMessage;
      if (progressMessage.report_id === reportId) {
        handler(progressMessage);
      }
    });
  }

  subscribeToReportStatus(reportId: string, handler: (message: ReportStatusMessage) => void): () => void {
    return this.subscribe('report_status', (message) => {
      const statusMessage = message as ReportStatusMessage;
      if (statusMessage.report_id === reportId) {
        handler(statusMessage);
      }
    });
  }

  subscribeToReportCompletion(reportId: string, handler: (message: ReportCompletedMessage) => void): () => void {
    return this.subscribe('report_completed', (message) => {
      const completedMessage = message as ReportCompletedMessage;
      if (completedMessage.report_id === reportId) {
        handler(completedMessage);
      }
    });
  }

  subscribeToAllReportEvents(handler: (message: ReportWebSocketMessage) => void): () => void {
    const unsubscribeProgress = this.subscribe('report_progress', handler);
    const unsubscribeStatus = this.subscribe('report_status', handler);
    const unsubscribeCompleted = this.subscribe('report_completed', handler);

    // Return combined unsubscribe function
    return () => {
      unsubscribeProgress();
      unsubscribeStatus();
      unsubscribeCompleted();
    };
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.connectionPromise = null;
    this.messageHandlers.clear();
  }

  /**
   * Refresh connection with new token (called after token refresh)
   */
  async refreshConnection(): Promise<void> {
    Logger.log('🔌 Refreshing WebSocket connection with new token');
    this.disconnect();
    return this.connect();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Global WebSocket service instance
export const websocketService = new WebSocketService();

// Note: WebSocket connection is initiated manually when needed, not auto-connected
// This prevents authentication errors during module evaluation

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    websocketService.disconnect();
  });
}
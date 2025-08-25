/**
 * AI Service - Frontend service for AI Insights API integration
 */

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  insight_type: 'anomaly' | 'optimization' | 'prediction' | 'pattern' | 'recommendation' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  created_at: string;
  context_data?: any;
  recommended_actions?: string[];
  estimated_impact?: string;
  implementation_effort?: string;
}

export interface Anomaly {
  metric_name: string;
  current_value: number;
  expected_value: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context?: any;
}

export interface Prediction {
  prediction_type: string;
  pipeline_id?: string;
  pipeline_name?: string;
  predicted_value: number;
  confidence_score: number;
  prediction_horizon: string;
  unit: string;
  description: string;
  confidence_interval?: number[];
  features_used?: string[];
}

export interface Pattern {
  pattern_type: string;
  pattern_name: string;
  description: string;
  confidence_score: number;
  pattern_data: any;
  affected_entities?: string[];
  discovered_at: string;
}

export interface Recommendation {
  title: string;
  description: string;
  category: string;
  impact: string;
  effort: string;
  estimated_improvement: string;
  implementation_steps: string[];
  estimated_savings?: string;
}

export interface AIInsightsData {
  organization_id: string;
  generated_at: string;
  time_range: string;
  summary: {
    total_insights: number;
    anomalies_detected: number;
    predictions_generated: number;
    patterns_discovered: number;
    recommendations_available: number;
  };
  anomalies: Anomaly[];
  predictions: Prediction[];
  patterns: Pattern[];
  recommendations: Recommendation[];
  performance_metrics: {
    total_insights_generated: number;
    average_confidence_score: number;
    high_confidence_insights: number;
    critical_insights_detected: number;
    insights_by_type: Record<string, number>;
  };
}

export interface PipelineAnalysis {
  pipeline_id: string;
  time_range: string;
  analysis_timestamp: string;
  anomalies: {
    count: number;
    details: Anomaly[];
  };
  predictions: {
    count: number;
    details: Prediction[];
  };
  patterns: {
    count: number;
    details: Pattern[];
  };
  overall_health_score: number;
  recommendations: string[];
}

class AIService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private baseUrl = `${this.apiUrl}/api/v1/ai`;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getInsights(timeRange: string = '24h'): Promise<AIInsightsData> {
    try {
      const response = await fetch(`${this.baseUrl}/insights?time_range=${timeRange}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      throw error;
    }
  }

  async getAnomalies(timeRange: string = '24h', pipelineId?: string): Promise<Anomaly[]> {
    try {
      const params = new URLSearchParams({ time_range: timeRange });
      if (pipelineId) {
        params.append('pipeline_id', pipelineId);
      }

      const response = await fetch(`${this.baseUrl}/anomalies?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch anomalies: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.anomalies;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      throw error;
    }
  }

  async getPredictions(predictionType?: string, pipelineId?: string): Promise<Prediction[]> {
    try {
      const params = new URLSearchParams();
      if (predictionType) params.append('prediction_type', predictionType);
      if (pipelineId) params.append('pipeline_id', pipelineId);

      const response = await fetch(`${this.baseUrl}/predictions?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch predictions: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.predictions;
    } catch (error) {
      console.error('Error fetching predictions:', error);
      throw error;
    }
  }

  async getPatterns(timeRange: string = '7d', patternType?: string): Promise<Pattern[]> {
    try {
      const params = new URLSearchParams({ time_range: timeRange });
      if (patternType) params.append('pattern_type', patternType);

      const response = await fetch(`${this.baseUrl}/patterns?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patterns: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.patterns;
    } catch (error) {
      console.error('Error fetching patterns:', error);
      throw error;
    }
  }

  async getRecommendations(category?: string): Promise<Recommendation[]> {
    try {
      const params = category ? new URLSearchParams({ category }) : '';
      const response = await fetch(`${this.baseUrl}/recommendations?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.recommendations;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  async analyzePipeline(pipelineId: string, timeRange: string = '30d'): Promise<PipelineAnalysis> {
    try {
      const response = await fetch(
        `${this.baseUrl}/analyze-pipeline/${pipelineId}?time_range=${timeRange}`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to analyze pipeline: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error analyzing pipeline:', error);
      throw error;
    }
  }

  async getAIMetrics() {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch AI metrics: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching AI metrics:', error);
      throw error;
    }
  }

  // Real-time WebSocket connection
  connectWebSocket(organizationId: string, onInsightUpdate: (data: AIInsightsData) => void) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/ai/stream`;

    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('AI WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Send initial request for insights
      this.websocket?.send(JSON.stringify({
        type: 'request_insights',
        organization_id: organizationId,
      }));
    };

    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'insights_update') {
          onInsightUpdate(message.data);
        } else if (message.type === 'error') {
          console.error('WebSocket error:', message.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('AI WebSocket disconnected');
      this.websocket = null;
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
          this.connectWebSocket(organizationId, onInsightUpdate);
        }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // ML Service Integration
  private mlBaseUrl = `${this.apiUrl}/api/v1/ml`;

  async trainModels(forceRetrain: boolean = false): Promise<any> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/train?force_retrain=${forceRetrain}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to train models: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error training models:', error);
      throw error;
    }
  }

  async getModelStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/status`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting model status:', error);
      throw error;
    }
  }

  async makePredictions(pipelineConfig?: any): Promise<any> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/predict`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ pipeline_config: pipelineConfig }),
      });

      if (!response.ok) {
        throw new Error(`Failed to make predictions: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error making predictions:', error);
      throw error;
    }
  }

  async getMLRecommendations(): Promise<Recommendation[]> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/recommendations`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get ML recommendations: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data.recommendations;
    } catch (error) {
      console.error('Error getting ML recommendations:', error);
      throw error;
    }
  }

  // Combined method to get both statistical and ML recommendations
  async getAllRecommendations(category?: string): Promise<{
    statistical: Recommendation[],
    ml: Recommendation[],
    combined: Recommendation[]
  }> {
    try {
      const [statistical, ml] = await Promise.allSettled([
        this.getRecommendations(category),
        this.getMLRecommendations()
      ]);

      const statisticalRecs = statistical.status === 'fulfilled' ? statistical.value : [];
      const mlRecs = ml.status === 'fulfilled' ? ml.value : [];
      
      // Combine and deduplicate by title
      const combinedRecs = [...statisticalRecs];
      mlRecs.forEach(mlRec => {
        if (!combinedRecs.some(rec => rec.title === mlRec.title)) {
          combinedRecs.push({
            ...mlRec,
            title: `[ML] ${mlRec.title}` // Mark ML recommendations
          });
        }
      });

      return {
        statistical: statisticalRecs,
        ml: mlRecs,
        combined: combinedRecs
      };
    } catch (error) {
      console.error('Error getting all recommendations:', error);
      return {
        statistical: [],
        ml: [],
        combined: []
      };
    }
  }

  async getModelPerformance(): Promise<any> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/performance`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model performance: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting model performance:', error);
      throw error;
    }
  }

  async getMLHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.mlBaseUrl}/health`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get ML health: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting ML health:', error);
      throw error;
    }
  }

  // Utility methods
  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }

  getInsightTypeIcon(type: string): string {
    switch (type) {
      case 'anomaly': return '⚠️';
      case 'prediction': return '🔮';
      case 'pattern': return '📊';
      case 'recommendation': return '💡';
      case 'optimization': return '⚡';
      case 'alert': return '🚨';
      default: return '📈';
    }
  }

  formatConfidenceScore(score: number): string {
    return `${Math.round(score)}%`;
  }

  formatPredictionHorizon(horizon: string): string {
    const horizonMap: Record<string, string> = {
      'next_execution': 'Next Execution',
      '1h': 'Next Hour',
      '24h': 'Next 24 Hours',
      '7d': 'Next Week',
      '30d': 'Next Month',
    };
    return horizonMap[horizon] || horizon;
  }
}

export const aiService = new AIService();
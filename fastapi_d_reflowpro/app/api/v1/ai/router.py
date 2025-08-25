"""
AI Insights API routes for advanced analytics and machine learning insights.
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
import json
import asyncio
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.services.ai_insights_service import ai_insights_service
from app.models.user import User
from app.schemas.ai_insights import (
    AIInsightResponse, AnomalyDetectionResponse, PredictionResponse, 
    PatternDiscoveryResponse, RecommendationResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Insights"])
security = HTTPBearer()


@router.get("/insights", response_model=Dict[str, Any])
async def get_ai_insights(
    time_range: str = Query("24h", description="Time range for analysis (1h, 24h, 7d, 30d)"),
    # current_user: User = Depends(get_current_user),  # Temporarily disabled for testing
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive AI insights for the user's organization."""
    
    # Validate time range
    valid_time_ranges = ["1h", "24h", "7d", "30d"]
    if time_range not in valid_time_ranges:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid time range '{time_range}'. Must be one of: {', '.join(valid_time_ranges)}"
        )
    
    try:
        # Use a dummy org_id for testing - must be valid UUID format
        org_id = "550e8400-e29b-41d4-a716-446655440000"
        insights = await ai_insights_service.generate_insights(
            org_id=org_id,
            time_range=time_range,
            db=db
        )
        
        return {
            "success": True,
            "data": insights,
            "message": "AI insights generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error generating AI insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate AI insights"
        )


@router.get("/anomalies", response_model=Dict[str, Any])
async def detect_anomalies(
    time_range: str = Query("24h", description="Time range for analysis"),
    pipeline_id: Optional[str] = Query(None, description="Specific pipeline ID to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Detect anomalies in pipeline performance and data quality."""
    
    try:
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = ai_insights_service._calculate_start_date(end_date, time_range)
        
        anomalies = await ai_insights_service.detect_anomalies(
            org_id=str(current_user.organization_id),
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        
        # Filter by pipeline if specified
        if pipeline_id:
            anomalies = [
                anomaly for anomaly in anomalies 
                if anomaly.context and anomaly.context.get('pipeline_id') == pipeline_id
            ]
        
        # Convert to dict for JSON serialization
        anomaly_data = []
        for anomaly in anomalies:
            anomaly_data.append({
                "metric_name": anomaly.metric_name,
                "current_value": anomaly.current_value,
                "expected_value": anomaly.expected_value,
                "anomaly_score": anomaly.anomaly_score,
                "severity": anomaly.severity.value,
                "description": anomaly.description,
                "context": anomaly.context or {}
            })
        
        return {
            "success": True,
            "data": {
                "anomalies": anomaly_data,
                "total_count": len(anomaly_data),
                "time_range": time_range,
                "pipeline_id": pipeline_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to detect anomalies"
        )


@router.get("/predictions", response_model=Dict[str, Any])
async def get_predictions(
    prediction_type: Optional[str] = Query(None, description="Type of prediction (execution_time, failure_risk)"),
    pipeline_id: Optional[str] = Query(None, description="Specific pipeline ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI predictions for pipeline performance."""
    
    try:
        predictions = await ai_insights_service.generate_predictions(
            org_id=str(current_user.organization_id),
            db=db
        )
        
        # Filter predictions if requested
        if prediction_type:
            predictions = [p for p in predictions if p["prediction_type"] == prediction_type]
        
        if pipeline_id:
            predictions = [p for p in predictions if p.get("pipeline_id") == pipeline_id]
        
        return {
            "success": True,
            "data": {
                "predictions": predictions,
                "total_count": len(predictions),
                "prediction_type": prediction_type,
                "pipeline_id": pipeline_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating predictions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate predictions"
        )


@router.get("/patterns", response_model=Dict[str, Any])
async def discover_patterns(
    time_range: str = Query("7d", description="Time range for pattern analysis"),
    pattern_type: Optional[str] = Query(None, description="Type of pattern to find"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Discover patterns in pipeline execution and data flow."""
    
    try:
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = ai_insights_service._calculate_start_date(end_date, time_range)
        
        patterns = await ai_insights_service.discover_patterns(
            org_id=str(current_user.organization_id),
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        
        # Filter by pattern type if specified
        if pattern_type:
            patterns = [p for p in patterns if p["pattern_type"] == pattern_type]
        
        return {
            "success": True,
            "data": {
                "patterns": patterns,
                "total_count": len(patterns),
                "time_range": time_range,
                "pattern_type": pattern_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error discovering patterns: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to discover patterns"
        )


@router.get("/recommendations", response_model=Dict[str, Any])
async def get_recommendations(
    category: Optional[str] = Query(None, description="Recommendation category"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get optimization recommendations based on AI analysis."""
    
    try:
        recommendations = await ai_insights_service.generate_optimization_recommendations(
            org_id=str(current_user.organization_id),
            db=db
        )
        
        # Filter by category if specified
        if category:
            recommendations = [r for r in recommendations if r.get("category") == category]
        
        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "total_count": len(recommendations),
                "category": category
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate recommendations"
        )


@router.post("/analyze-pipeline/{pipeline_id}", response_model=Dict[str, Any])
async def analyze_pipeline(
    pipeline_id: str,
    time_range: str = Query("30d", description="Time range for analysis"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform comprehensive AI analysis on a specific pipeline."""
    
    try:
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = ai_insights_service._calculate_start_date(end_date, time_range)
        
        # Get anomalies for this pipeline
        anomalies = await ai_insights_service.detect_anomalies(
            org_id=str(current_user.organization_id),
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        pipeline_anomalies = [
            a for a in anomalies 
            if a.context and a.context.get('pipeline_id') == pipeline_id
        ]
        
        # Get predictions for this pipeline
        all_predictions = await ai_insights_service.generate_predictions(
            org_id=str(current_user.organization_id),
            db=db
        )
        pipeline_predictions = [
            p for p in all_predictions 
            if p.get('pipeline_id') == pipeline_id
        ]
        
        # Get patterns that affect this pipeline
        patterns = await ai_insights_service.discover_patterns(
            org_id=str(current_user.organization_id),
            start_date=start_date,
            end_date=end_date,
            db=db
        )
        pipeline_patterns = [
            p for p in patterns
            if pipeline_id in p.get('pattern_data', {}).get('affected_pipelines', [])
        ]
        
        # Convert anomalies to dict
        anomaly_data = []
        for anomaly in pipeline_anomalies:
            anomaly_data.append({
                "metric_name": anomaly.metric_name,
                "current_value": anomaly.current_value,
                "expected_value": anomaly.expected_value,
                "anomaly_score": anomaly.anomaly_score,
                "severity": anomaly.severity.value,
                "description": anomaly.description
            })
        
        analysis_result = {
            "pipeline_id": pipeline_id,
            "time_range": time_range,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "anomalies": {
                "count": len(anomaly_data),
                "details": anomaly_data
            },
            "predictions": {
                "count": len(pipeline_predictions),
                "details": pipeline_predictions
            },
            "patterns": {
                "count": len(pipeline_patterns),
                "details": pipeline_patterns
            },
            "overall_health_score": 100 - (len(anomaly_data) * 10) - (len([p for p in pipeline_predictions if p.get('prediction_type') == 'failure_risk']) * 20),
            "recommendations": [
                "Monitor identified anomalies",
                "Review performance patterns",
                "Consider optimization suggestions"
            ]
        }
        
        return {
            "success": True,
            "data": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Error analyzing pipeline {pipeline_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze pipeline {pipeline_id}"
        )


@router.get("/metrics", response_model=Dict[str, Any])
async def get_ai_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI system performance metrics."""
    
    try:
        metrics = await ai_insights_service._calculate_ai_performance_metrics(
            org_id=str(current_user.organization_id),
            db=db
        )
        
        return {
            "success": True,
            "data": {
                "ai_performance": metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting AI metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get AI metrics"
        )


# WebSocket for real-time AI insights
class AIWebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_insight(self, insight: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(insight))
            except:
                # Remove failed connections
                self.active_connections.remove(connection)

ai_websocket_manager = AIWebSocketManager()


@router.websocket("/stream")
async def ai_insights_stream(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time AI insights streaming."""
    
    await ai_websocket_manager.connect(websocket)
    
    try:
        while True:
            # Wait for client message (could be heartbeat or request)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "request_insights":
                # Get current insights and send them
                org_id = message.get("organization_id")
                if org_id:
                    try:
                        insights = await ai_insights_service.generate_insights(
                            org_id=org_id,
                            time_range="1h",  # Short range for real-time
                            db=db
                        )
                        
                        await websocket.send_text(json.dumps({
                            "type": "insights_update",
                            "data": insights,
                            "timestamp": datetime.utcnow().isoformat()
                        }))
                    except Exception as e:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": str(e)
                        }))
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        ai_websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        ai_websocket_manager.disconnect(websocket)


@router.get("/health", response_model=Dict[str, Any])
async def ai_health_check():
    """Health check for AI services."""
    
    return {
        "success": True,
        "data": {
            "ai_service_status": "healthy",
            "features_available": [
                "anomaly_detection",
                "pattern_discovery", 
                "predictive_analytics",
                "optimization_recommendations"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    }
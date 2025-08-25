"""
ML Training and Prediction API endpoints.
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.ml.training_service import ml_training_service
from app.services.telemetry_service import TelemetryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])
security = HTTPBearer()


@router.post("/train")
async def train_models(
    background_tasks: BackgroundTasks,
    force_retrain: bool = Query(False, description="Force model retraining"),
    # current_user: User = Depends(get_current_user),  # Temporarily disabled for testing
    db: AsyncSession = Depends(get_db)
):
    """
    Train ML models for performance prediction and optimization.
    
    This endpoint triggers the training of machine learning models based on
    historical telemetry data. Training runs in the background.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        
        # Add training task to background
        background_tasks.add_task(
            _train_models_background,
            db,
            org_id,
            force_retrain
        )
        
        return {
            "success": True,
            "message": "Model training started in background",
            "organization_id": org_id,
            "force_retrain": force_retrain
        }
        
    except Exception as e:
        logger.error(f"Error starting model training: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to start model training"
        )


async def _train_models_background(db: AsyncSession, org_id: str, force_retrain: bool):
    """Background task for model training."""
    try:
        logger.info(f"Starting background model training for org {org_id}")
        result = await ml_training_service.train_models(db, org_id, force_retrain)
        logger.info(f"Model training completed: {result}")
    except Exception as e:
        logger.error(f"Background model training failed: {str(e)}")


@router.get("/status")
async def get_model_status(
    # current_user: User = Depends(get_current_user),  # Temporarily disabled for testing
    db: AsyncSession = Depends(get_db)
):
    """
    Get the status of trained ML models.
    
    Returns information about model training status, performance,
    and when the models were last updated.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        status = await ml_training_service.get_model_status(org_id)
        
        return {
            "success": True,
            "data": status,
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get model status"
        )


@router.post("/predict")
async def make_predictions(
    pipeline_config: Optional[Dict[str, Any]] = None,
    # current_user: User = Depends(get_current_user),  # Temporarily disabled for testing
    db: AsyncSession = Depends(get_db)
):
    """
    Make performance predictions using trained ML models.
    
    Provides predictions for execution time, failure risk, resource usage,
    and optimization recommendations based on pipeline configuration.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        
        # Get recent telemetry data for prediction if no config provided
        if not pipeline_config:
            features_df, _ = await ml_training_service.prepare_training_data(
                db, org_id, days_back=7
            )
        else:
            # Convert config to DataFrame for prediction
            import pandas as pd
            features_df = pd.DataFrame([pipeline_config])
        
        if len(features_df) == 0:
            return {
                "success": False,
                "message": "No data available for predictions",
                "predictions": {}
            }
        
        # Make predictions
        prediction_result = await ml_training_service.predict_performance(
            features_df, org_id
        )
        
        return {
            "success": True,
            "data": prediction_result,
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to make predictions"
        )


@router.get("/recommendations")
async def get_ml_recommendations(
    # current_user: User = Depends(get_current_user),  # Temporarily disabled for testing
    db: AsyncSession = Depends(get_db)
):
    """
    Get ML-based optimization recommendations.
    
    Returns actionable recommendations for improving pipeline performance
    based on machine learning analysis of historical data.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        
        # Get recent telemetry data
        features_df, _ = await ml_training_service.prepare_training_data(
            db, org_id, days_back=7
        )
        
        if len(features_df) == 0:
            return {
                "success": False,
                "message": "No data available for recommendations",
                "recommendations": []
            }
        
        # Get ML predictions and recommendations
        prediction_result = await ml_training_service.predict_performance(
            features_df, org_id
        )
        
        recommendations = []
        if prediction_result['status'] == 'success':
            recommendations = prediction_result.get('recommendations', [])
        
        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "total_count": len(recommendations),
                "model_status": prediction_result['status']
            },
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get ML recommendations"
        )


@router.get("/performance")
async def get_model_performance(
    # current_user: User = Depends(get_current_user)  # Temporarily disabled for testing
):
    """
    Get performance metrics of trained ML models.
    
    Returns accuracy, precision, recall, and other metrics
    for each trained model type.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        
        # Check if models are loaded
        if not ml_training_service.performance_optimizer.models_trained:
            await ml_training_service._load_latest_models(org_id)
        
        if not ml_training_service.performance_optimizer.models_trained:
            return {
                "success": False,
                "message": "No trained models available",
                "performance": {}
            }
        
        # Get model performance summary
        performance = ml_training_service.performance_optimizer.get_model_performance_summary()
        
        return {
            "success": True,
            "data": {
                "performance": performance,
                "model_version": ml_training_service.current_model_version,
                "models_trained": ml_training_service.performance_optimizer.models_trained
            },
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error getting model performance: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get model performance"
        )


@router.delete("/models")
async def cleanup_old_models(
    keep_versions: int = Query(3, description="Number of model versions to keep"),
    # current_user: User = Depends(get_current_user)  # Temporarily disabled for testing
):
    """
    Clean up old model versions.
    
    Removes old model versions to save disk space, keeping only
    the most recent specified number of versions.
    """
    
    try:
        org_id = "550e8400-e29b-41d4-a716-446655440000"  # Use dummy org_id for testing
        
        await ml_training_service.cleanup_old_models(org_id, keep_versions)
        
        return {
            "success": True,
            "message": f"Cleaned up old models, keeping {keep_versions} versions",
            "organization_id": org_id
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up models: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clean up models"
        )


@router.get("/health")
async def ml_health_check():
    """
    Health check for ML services.
    
    Returns the status of ML components and available features.
    """
    
    try:
        # Check if core ML components are available
        import sklearn
        import pandas as pd
        import numpy as np
        
        return {
            "success": True,
            "data": {
                "ml_service_status": "healthy",
                "features_available": [
                    "model_training",
                    "performance_prediction",
                    "failure_prediction",
                    "resource_optimization",
                    "anomaly_detection"
                ],
                "libraries": {
                    "scikit-learn": sklearn.__version__,
                    "pandas": pd.__version__,
                    "numpy": np.__version__
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except ImportError as e:
        return {
            "success": False,
            "data": {
                "ml_service_status": "unhealthy",
                "error": f"Missing dependency: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        return {
            "success": False,
            "data": {
                "ml_service_status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
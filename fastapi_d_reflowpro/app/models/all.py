# Import all models here to ensure they are registered with SQLAlchemy

from .user import Organization, User, APIKey
from .connector import DataConnector, DataPreview, ConnectorType, ConnectorStatus
from .pipeline import (
    ETLPipeline, 
    PipelineStep, 
    PipelineExecution, 
    TransformationTemplate,
    PipelineStatus,
    ExecutionStatus,
    TransformationType
)

__all__ = [
    # User models
    "Organization",
    "User", 
    "APIKey",
    
    # Connector models
    "DataConnector",
    "DataPreview", 
    "ConnectorType",
    "ConnectorStatus",
    
    # Pipeline models
    "ETLPipeline",
    "PipelineStep",
    "PipelineExecution", 
    "TransformationTemplate",
    "PipelineStatus",
    "ExecutionStatus",
    "TransformationType"
]
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from ..models.pipeline import PipelineStatus, ExecutionStatus, TransformationType


# Enums for API
class PipelineStatusEnum(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    RUNNING = "running"
    ERROR = "error"


class ExecutionStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TransformationTypeEnum(str, Enum):
    FILTER = "filter"
    MAP = "map"
    AGGREGATE = "aggregate"
    JOIN = "join"
    SORT = "sort"
    DEDUPLICATE = "deduplicate"
    VALIDATE = "validate"
    CALCULATE = "calculate"
    SPLIT = "split"
    MERGE = "merge"


# Base schemas
class PipelineStepBase(BaseModel):
    step_order: int = Field(..., description="Order of the step in pipeline")
    step_type: str = Field(..., description="Type of step: source, transform, destination")
    step_name: str = Field(..., description="Display name for the step")
    step_config: Dict[str, Any] = Field(..., description="Configuration for this step")
    source_connector_id: Optional[uuid.UUID] = Field(None, description="ID of source connector if applicable")
    transformation_type: Optional[TransformationTypeEnum] = Field(None, description="Type of transformation")
    transformation_config: Optional[Dict[str, Any]] = Field(None, description="Transformation configuration")

    @validator('step_type')
    def validate_step_type(cls, v):
        allowed_types = ['source', 'transform', 'destination']
        if v not in allowed_types:
            raise ValueError(f'step_type must be one of {allowed_types}')
        return v


class PipelineStepCreate(PipelineStepBase):
    pass


class PipelineStepUpdate(BaseModel):
    step_order: Optional[int] = None
    step_type: Optional[str] = None
    step_name: Optional[str] = None
    step_config: Optional[Dict[str, Any]] = None
    source_connector_id: Optional[uuid.UUID] = None
    transformation_type: Optional[TransformationTypeEnum] = None
    transformation_config: Optional[Dict[str, Any]] = None

    @validator('step_type')
    def validate_step_type(cls, v):
        if v is not None:
            allowed_types = ['source', 'transform', 'destination']
            if v not in allowed_types:
                raise ValueError(f'step_type must be one of {allowed_types}')
        return v


class PipelineStepResponse(PipelineStepBase):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Pipeline schemas
class PipelineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Pipeline name")
    description: Optional[str] = Field(None, description="Pipeline description")
    status: Optional[PipelineStatusEnum] = Field(PipelineStatusEnum.DRAFT, description="Pipeline status")
    pipeline_config: Optional[Dict[str, Any]] = Field(None, description="Visual pipeline configuration")
    schedule_cron: Optional[str] = Field(None, description="Cron expression for scheduling")
    is_scheduled: bool = Field(False, description="Whether pipeline is scheduled")
    tags: Optional[List[str]] = Field(None, description="Pipeline tags")

    @validator('schedule_cron')
    def validate_cron(cls, v):
        if v is not None and v.strip():
            # Basic cron validation - should have 5 or 6 parts
            parts = v.strip().split()
            if len(parts) < 5 or len(parts) > 6:
                raise ValueError('Invalid cron expression format')
        return v


class PipelineCreate(PipelineBase):
    steps: Optional[List[PipelineStepCreate]] = Field(None, description="Pipeline steps")


class PipelineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[PipelineStatusEnum] = None
    pipeline_config: Optional[Dict[str, Any]] = None
    schedule_cron: Optional[str] = None
    is_scheduled: Optional[bool] = None
    tags: Optional[List[str]] = None
    steps: Optional[List[PipelineStepCreate]] = None

    @validator('schedule_cron')
    def validate_cron(cls, v):
        if v is not None and v.strip():
            parts = v.strip().split()
            if len(parts) < 5 or len(parts) > 6:
                raise ValueError('Invalid cron expression format')
        return v


class PipelineResponse(PipelineBase):
    id: uuid.UUID
    organization_id: Optional[uuid.UUID]
    created_by_id: uuid.UUID
    version: int
    next_run: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    steps: List[PipelineStepResponse] = []

    class Config:
        from_attributes = True


class PipelineListResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: PipelineStatusEnum
    is_scheduled: bool
    next_run: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    step_count: Optional[int] = Field(None, description="Number of steps in pipeline")
    last_execution: Optional[datetime] = Field(None, description="Last execution time")
    last_execution_status: Optional[ExecutionStatusEnum] = Field(None, description="Last execution status")

    class Config:
        from_attributes = True


# Pipeline execution schemas
class PipelineExecutionBase(BaseModel):
    trigger_type: Optional[str] = Field(None, description="manual, scheduled, webhook")
    trigger_data: Optional[Dict[str, Any]] = Field(None, description="Trigger metadata")


class PipelineExecutionCreate(PipelineExecutionBase):
    pass


class PipelineExecutionResponse(PipelineExecutionBase):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    status: ExecutionStatusEnum
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    started_by_id: Optional[uuid.UUID]
    rows_processed: int = 0
    rows_successful: int = 0
    rows_failed: int = 0
    execution_log: Optional[str]
    error_log: Optional[str]
    execution_metrics: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


# Bulk operations
class PipelineBulkUpdateRequest(BaseModel):
    pipeline_ids: List[uuid.UUID] = Field(..., description="List of pipeline IDs to update")
    updates: PipelineUpdate = Field(..., description="Updates to apply to all pipelines")


class PipelineBulkResponse(BaseModel):
    success_count: int = Field(..., description="Number of successfully updated pipelines")
    error_count: int = Field(..., description="Number of failed updates")
    errors: List[str] = Field(default=[], description="List of error messages")


# Search and filter schemas
class PipelineSearchRequest(BaseModel):
    search: Optional[str] = Field(None, description="Search term for name/description")
    status: Optional[List[PipelineStatusEnum]] = Field(None, description="Filter by status")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    is_scheduled: Optional[bool] = Field(None, description="Filter by scheduling status")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    limit: Optional[int] = Field(20, ge=1, le=100, description="Number of results to return")
    offset: Optional[int] = Field(0, ge=0, description="Number of results to skip")


class PipelineSearchResponse(BaseModel):
    pipelines: List[PipelineListResponse]
    total: int = Field(..., description="Total number of matching pipelines")
    limit: int
    offset: int
    has_more: bool = Field(..., description="Whether there are more results")


# Template schemas
class TransformationTemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    category: str
    transformation_type: TransformationTypeEnum
    template_config: Dict[str, Any]
    ui_config: Dict[str, Any]
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# Validation and testing schemas
class PipelineValidationRequest(BaseModel):
    pipeline_config: Dict[str, Any] = Field(..., description="Pipeline configuration to validate")
    steps: List[PipelineStepCreate] = Field(..., description="Steps to validate")


class PipelineValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []


class PipelineTestRequest(BaseModel):
    pipeline_id: uuid.UUID
    test_data: Optional[Dict[str, Any]] = Field(None, description="Sample data for testing")
    step_limit: Optional[int] = Field(None, description="Limit execution to first N steps")


class PipelineTestResponse(BaseModel):
    test_id: uuid.UUID
    status: str
    results: Optional[Dict[str, Any]] = None
    errors: List[str] = []
    execution_time_ms: Optional[int] = None
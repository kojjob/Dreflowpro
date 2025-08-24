from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import re

from ..models.pipeline import PipelineStatus, ExecutionStatus, TransformationType
from ..core.validators import ValidatorMixin, ValidationError


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
class PipelineStepBase(BaseModel, ValidatorMixin):
    step_order: int = Field(..., ge=1, le=100, description="Order of the step in pipeline")
    step_type: str = Field(..., description="Type of step: source, transform, destination")
    step_name: str = Field(..., min_length=1, max_length=100, description="Display name for the step")
    step_config: Dict[str, Any] = Field(..., description="Configuration for this step")
    source_connector_id: Optional[uuid.UUID] = Field(None, description="ID of source connector if applicable")
    transformation_type: Optional[TransformationTypeEnum] = Field(None, description="Type of transformation")
    transformation_config: Optional[Dict[str, Any]] = Field(None, description="Transformation configuration")
    is_enabled: Optional[bool] = Field(True, description="Whether step is enabled")
    retry_config: Optional[Dict[str, Any]] = Field(None, description="Retry configuration")

    @field_validator('step_type')
    @classmethod
    def validate_step_type(cls, v):
        allowed_types = ['source', 'transform', 'destination']
        if v not in allowed_types:
            raise ValidationError(
                f'step_type must be one of {allowed_types}',
                field="step_type",
                code="STEP_TYPE_INVALID"
            )
        return v
    
    @field_validator('step_name')
    @classmethod
    def validate_step_name(cls, v):
        v = cls.sanitize_string_input(v.strip(), max_length=100)
        
        if not re.match(r'^[a-zA-Z0-9\s_-]+$', v):
            raise ValidationError(
                "Step name can only contain letters, numbers, spaces, underscores, and hyphens",
                field="step_name",
                code="STEP_NAME_INVALID_CHARS"
            )
        
        return v
    
    @field_validator('step_config')
    @classmethod
    def validate_step_config(cls, v):
        return cls.validate_json_data(v)
    
    @field_validator('transformation_config')
    @classmethod
    def validate_transformation_config(cls, v):
        if v is None:
            return v
        return cls.validate_json_data(v)
    
    @field_validator('retry_config')
    @classmethod
    def validate_retry_config(cls, v):
        if v is None:
            return v
        
        v = cls.validate_json_data(v)
        
        # Validate retry configuration structure
        if 'max_attempts' in v:
            max_attempts = v['max_attempts']
            if not isinstance(max_attempts, int) or max_attempts < 1 or max_attempts > 10:
                raise ValidationError(
                    "Retry max_attempts must be between 1 and 10",
                    field="retry_config.max_attempts",
                    code="RETRY_MAX_ATTEMPTS_INVALID"
                )
        
        if 'delay_seconds' in v:
            delay_seconds = v['delay_seconds']
            if not isinstance(delay_seconds, (int, float)) or delay_seconds < 0 or delay_seconds > 300:
                raise ValidationError(
                    "Retry delay_seconds must be between 0 and 300",
                    field="retry_config.delay_seconds",
                    code="RETRY_DELAY_INVALID"
                )
        
        return v
    
    @model_validator(mode='after')
    def validate_step_consistency(self):
        # Transform steps should have transformation_type
        if self.step_type == 'transform' and not self.transformation_type:
            raise ValidationError(
                "Transform steps must specify transformation_type",
                field="transformation_type",
                code="TRANSFORM_TYPE_REQUIRED"
            )
        
        # Source steps should have source_connector_id
        if self.step_type == 'source' and not self.source_connector_id:
            raise ValidationError(
                "Source steps must specify source_connector_id",
                field="source_connector_id",
                code="SOURCE_CONNECTOR_REQUIRED"
            )
        
        return self


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

    @field_validator('step_type')
    @classmethod
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
class PipelineBase(BaseModel, ValidatorMixin):
    name: str = Field(..., min_length=1, max_length=255, description="Pipeline name")
    description: Optional[str] = Field(None, max_length=2000, description="Pipeline description")
    status: Optional[PipelineStatusEnum] = Field(PipelineStatusEnum.DRAFT, description="Pipeline status")
    pipeline_config: Optional[Dict[str, Any]] = Field(None, description="Visual pipeline configuration")
    schedule_cron: Optional[str] = Field(None, description="Cron expression for scheduling")
    is_scheduled: bool = Field(False, description="Whether pipeline is scheduled")
    tags: Optional[List[str]] = Field(None, description="Pipeline tags")
    priority: Optional[int] = Field(5, ge=1, le=10, description="Pipeline execution priority (1=highest, 10=lowest)")
    timeout_minutes: Optional[int] = Field(60, ge=1, le=1440, description="Pipeline timeout in minutes")
    notification_config: Optional[Dict[str, Any]] = Field(None, description="Notification settings")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = cls.sanitize_string_input(v.strip(), max_length=255)
        
        if not re.match(r'^[a-zA-Z0-9\s_-]+$', v):
            raise ValidationError(
                "Pipeline name can only contain letters, numbers, spaces, underscores, and hyphens",
                field="name",
                code="PIPELINE_NAME_INVALID_CHARS"
            )
        
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return v
        return cls.sanitize_string_input(v.strip(), max_length=2000)
    
    @field_validator('schedule_cron')
    @classmethod
    def validate_cron(cls, v):
        if v is None or not v.strip():
            return v
        return cls.validate_cron_expression(v.strip())
    
    @field_validator('pipeline_config')
    @classmethod
    def validate_pipeline_config(cls, v):
        if v is None:
            return v
        return cls.validate_json_data(v)
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        if v is None:
            return v
        
        if len(v) > 50:
            raise ValidationError("Too many tags (maximum 50)", field="tags", code="TOO_MANY_TAGS")
        
        validated_tags = []
        for tag in v:
            if not isinstance(tag, str):
                raise ValidationError("Tags must be strings", field="tags", code="TAG_NON_STRING")
            
            tag = tag.strip().lower()
            if not tag:
                continue
            
            if len(tag) > 50:
                raise ValidationError("Tag too long (maximum 50 characters)", field="tags", code="TAG_TOO_LONG")
            
            if not re.match(r'^[a-z0-9-_]+$', tag):
                raise ValidationError(
                    "Tags can only contain lowercase letters, numbers, hyphens, and underscores",
                    field="tags",
                    code="TAG_INVALID_CHARS"
                )
            
            validated_tags.append(tag)
        
        return list(dict.fromkeys(validated_tags))
    
    @field_validator('notification_config')
    @classmethod
    def validate_notification_config(cls, v):
        if v is None:
            return v
        
        v = cls.validate_json_data(v)
        
        # Validate notification configuration structure
        valid_types = ['email', 'webhook', 'slack']
        
        for notification_type, config in v.items():
            if notification_type not in valid_types:
                raise ValidationError(
                    f"Invalid notification type '{notification_type}'. Valid types: {valid_types}",
                    field="notification_config",
                    code="NOTIFICATION_TYPE_INVALID"
                )
            
            if not isinstance(config, dict):
                raise ValidationError(
                    f"Notification config for '{notification_type}' must be an object",
                    field="notification_config",
                    code="NOTIFICATION_CONFIG_INVALID"
                )
        
        return v
    
    @model_validator(mode='after')
    def validate_scheduling_consistency(self):
        if self.is_scheduled and not self.schedule_cron:
            raise ValidationError(
                "Scheduled pipelines must have a cron expression",
                field="schedule_cron",
                code="SCHEDULE_CRON_REQUIRED"
            )
        
        if not self.is_scheduled and self.schedule_cron:
            # Auto-enable scheduling if cron is provided
            self.is_scheduled = True
        
        return self


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

    @field_validator('schedule_cron')
    @classmethod
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
class PipelineSearchRequest(BaseModel, ValidatorMixin):
    search: Optional[str] = Field(None, max_length=255, description="Search term for name/description")
    status: Optional[List[PipelineStatusEnum]] = Field(None, description="Filter by status")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    is_scheduled: Optional[bool] = Field(None, description="Filter by scheduling status")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    created_by: Optional[str] = Field(None, description="Filter by creator")
    priority: Optional[List[int]] = Field(None, description="Filter by priority levels")
    limit: Optional[int] = Field(20, ge=1, le=100, description="Number of results to return")
    offset: Optional[int] = Field(0, ge=0, description="Number of results to skip")
    sort_by: Optional[str] = Field("created_at", description="Sort field")
    sort_order: Optional[str] = Field("desc", description="Sort order: asc, desc")
    
    @field_validator('search')
    @classmethod
    def validate_search_term(cls, v):
        if v is None:
            return v
        
        v = cls.sanitize_string_input(v.strip(), max_length=255)
        
        if len(v) < 2:
            raise ValidationError(
                "Search term must be at least 2 characters long",
                field="search",
                code="SEARCH_TERM_TOO_SHORT"
            )
        
        return v
    
    @field_validator('priority')
    @classmethod
    def validate_priority_filter(cls, v):
        if v is None:
            return v
        
        for priority in v:
            if not isinstance(priority, int) or priority < 1 or priority > 10:
                raise ValidationError(
                    "Priority values must be between 1 and 10",
                    field="priority",
                    code="PRIORITY_INVALID"
                )
        
        return v
    
    @field_validator('sort_by')
    @classmethod
    def validate_sort_by(cls, v):
        valid_fields = ['name', 'created_at', 'updated_at', 'status', 'priority']
        if v not in valid_fields:
            raise ValidationError(
                f"Invalid sort field. Valid fields: {valid_fields}",
                field="sort_by",
                code="SORT_FIELD_INVALID"
            )
        return v
    
    @field_validator('sort_order')
    @classmethod
    def validate_sort_order(cls, v):
        if v.lower() not in ['asc', 'desc']:
            raise ValidationError(
                "Sort order must be 'asc' or 'desc'",
                field="sort_order",
                code="SORT_ORDER_INVALID"
            )
        return v.lower()
    
    @model_validator(mode='after')
    def validate_date_range(self):
        if self.created_after and self.created_before and self.created_after >= self.created_before:
            raise ValidationError(
                "created_after must be before created_before",
                field="created_after",
                code="DATE_RANGE_INVALID"
            )
        
        return self


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
class PipelineValidationRequest(BaseModel, ValidatorMixin):
    pipeline_config: Dict[str, Any] = Field(..., description="Pipeline configuration to validate")
    steps: List[PipelineStepCreate] = Field(..., description="Steps to validate")
    validation_level: Optional[str] = Field("standard", description="Validation level: basic, standard, strict")
    
    @field_validator('pipeline_config')
    @classmethod
    def validate_pipeline_config(cls, v):
        return cls.validate_json_data(v)
    
    @field_validator('steps')
    @classmethod
    def validate_steps_order(cls, v):
        if not v:
            raise ValidationError("Pipeline must have at least one step", field="steps", code="STEPS_EMPTY")
        
        if len(v) > 50:
            raise ValidationError("Too many steps (maximum 50)", field="steps", code="TOO_MANY_STEPS")
        
        # Check step order uniqueness and sequence
        step_orders = [step.step_order for step in v]
        if len(step_orders) != len(set(step_orders)):
            raise ValidationError("Step orders must be unique", field="steps", code="STEP_ORDER_DUPLICATE")
        
        # Check for logical step sequence
        has_source = any(step.step_type == 'source' for step in v)
        has_destination = any(step.step_type == 'destination' for step in v)
        
        if not has_source:
            raise ValidationError("Pipeline must have at least one source step", field="steps", code="NO_SOURCE_STEP")
        
        if not has_destination:
            raise ValidationError("Pipeline must have at least one destination step", field="steps", code="NO_DESTINATION_STEP")
        
        return v
    
    @field_validator('validation_level')
    @classmethod
    def validate_validation_level(cls, v):
        valid_levels = ['basic', 'standard', 'strict']
        if v not in valid_levels:
            raise ValidationError(
                f"Invalid validation level. Valid levels: {valid_levels}",
                field="validation_level",
                code="VALIDATION_LEVEL_INVALID"
            )
        return v


class PipelineValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []


class PipelineTestRequest(BaseModel, ValidatorMixin):
    pipeline_id: uuid.UUID
    test_data: Optional[Dict[str, Any]] = Field(None, description="Sample data for testing")
    step_limit: Optional[int] = Field(None, ge=1, le=50, description="Limit execution to first N steps")
    dry_run: Optional[bool] = Field(True, description="Whether this is a dry run (no data modification)")
    timeout_seconds: Optional[int] = Field(300, ge=30, le=3600, description="Test timeout in seconds")
    
    @field_validator('test_data')
    @classmethod
    def validate_test_data(cls, v):
        if v is None:
            return v
        return cls.validate_json_data(v)


class PipelineTestResponse(BaseModel):
    test_id: uuid.UUID
    status: str
    results: Optional[Dict[str, Any]] = None
    errors: List[str] = []
    execution_time_ms: Optional[int] = None
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional, Dict, Any
import uuid

from ....core.database import get_db
from ....core.deps import get_current_user
from ....models.user import User
from ....schemas.pipeline import (
    PipelineCreate, PipelineUpdate, PipelineResponse, PipelineListResponse,
    PipelineSearchRequest, PipelineSearchResponse, PipelineExecutionCreate,
    PipelineExecutionResponse, PipelineBulkUpdateRequest, PipelineBulkResponse,
    PipelineValidationRequest, PipelineValidationResponse, TransformationTemplateResponse
)
from ....services.pipeline_service import PipelineService
from ....models.pipeline import TransformationTemplate

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    pipeline_data: PipelineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new ETL pipeline."""
    
    service = PipelineService(db)
    
    try:
        pipeline = await service.create_pipeline(
            pipeline_data=pipeline_data,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        return pipeline
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/", response_model=PipelineSearchResponse)
async def list_pipelines(
    search: Optional[str] = Query(None, description="Search term for name/description"),
    status: Optional[List[str]] = Query(None, description="Filter by status"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    is_scheduled: Optional[bool] = Query(None, description="Filter by scheduling status"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List pipelines with optional filtering and pagination."""
    
    service = PipelineService(db)
    
    # Create search request
    search_request = PipelineSearchRequest(
        search=search,
        status=status,
        tags=tags,
        is_scheduled=is_scheduled,
        limit=limit,
        offset=offset
    )
    
    pipelines, total = await service.get_pipeline_list_with_stats(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        search_request=search_request
    )
    
    return PipelineSearchResponse(
        pipelines=pipelines,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + limit < total
    )


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific pipeline by ID."""
    
    service = PipelineService(db)
    
    pipeline = await service.get_pipeline(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )
    
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: uuid.UUID,
    pipeline_data: PipelineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing pipeline."""
    
    service = PipelineService(db)
    
    try:
        pipeline = await service.update_pipeline(
            pipeline_id=pipeline_id,
            pipeline_data=pipeline_data,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        
        if not pipeline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pipeline not found"
            )
        
        return pipeline
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a pipeline."""
    
    service = PipelineService(db)
    
    try:
        success = await service.delete_pipeline(
            pipeline_id=pipeline_id,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pipeline not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{pipeline_id}/execute", response_model=PipelineExecutionResponse, status_code=status.HTTP_201_CREATED)
async def execute_pipeline(
    pipeline_id: uuid.UUID,
    execution_data: PipelineExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger pipeline execution."""
    
    service = PipelineService(db)
    
    try:
        execution = await service.execute_pipeline(
            pipeline_id=pipeline_id,
            execution_data=execution_data,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pipeline not found"
            )
        
        return execution
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{pipeline_id}/executions", response_model=List[PipelineExecutionResponse])
async def get_pipeline_executions(
    pipeline_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get execution history for a pipeline."""
    
    service = PipelineService(db)
    
    executions, total = await service.get_pipeline_executions(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        limit=limit,
        offset=offset
    )
    
    if not executions and total == 0:
        # Check if pipeline exists
        pipeline = await service.get_pipeline(
            pipeline_id=pipeline_id,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        if not pipeline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pipeline not found"
            )
    
    return executions


@router.post("/bulk-update", response_model=PipelineBulkResponse)
async def bulk_update_pipelines(
    bulk_request: PipelineBulkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk update multiple pipelines."""
    
    service = PipelineService(db)
    
    result = await service.bulk_update_pipelines(
        pipeline_ids=bulk_request.pipeline_ids,
        updates=bulk_request.updates,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    return PipelineBulkResponse(
        success_count=result["success_count"],
        error_count=result["error_count"],
        errors=result["errors"]
    )


@router.post("/validate", response_model=PipelineValidationResponse)
async def validate_pipeline(
    validation_request: PipelineValidationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate pipeline configuration before saving."""
    
    service = PipelineService(db)
    
    # Convert Pydantic models to dict for validation
    steps_dict = [step.model_dump() for step in validation_request.steps]
    
    result = await service.validate_pipeline_config(
        pipeline_config=validation_request.pipeline_config,
        steps=steps_dict
    )
    
    return PipelineValidationResponse(
        is_valid=result["is_valid"],
        errors=result["errors"],
        warnings=result["warnings"],
        suggestions=result["suggestions"]
    )


@router.get("/templates/transformations", response_model=List[TransformationTemplateResponse])
async def get_transformation_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    transformation_type: Optional[str] = Query(None, description="Filter by transformation type"),
    db: AsyncSession = Depends(get_db)
):
    """Get available transformation templates."""
    
    query = select(TransformationTemplate).where(TransformationTemplate.is_active == True)
    
    if category:
        query = query.where(TransformationTemplate.category == category)
    
    if transformation_type:
        query = query.where(TransformationTemplate.transformation_type == transformation_type)
    
    query = query.order_by(desc(TransformationTemplate.usage_count))
    
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return templates


@router.get("/{pipeline_id}/clone", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def clone_pipeline(
    pipeline_id: uuid.UUID,
    name: Optional[str] = Query(None, description="Name for cloned pipeline"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clone an existing pipeline."""
    
    service = PipelineService(db)
    
    # Get the original pipeline
    original_pipeline = await service.get_pipeline(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    if not original_pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )
    
    # Create pipeline data for cloning
    clone_name = name if name else f"{original_pipeline.name} (Copy)"
    
    # Convert steps to PipelineStepCreate format
    from ....schemas.pipeline import PipelineStepCreate
    
    steps_data = []
    for step in original_pipeline.steps:
        step_create = PipelineStepCreate(
            step_order=step.step_order,
            step_type=step.step_type,
            step_name=step.step_name,
            step_config=step.step_config,
            source_connector_id=step.source_connector_id,
            transformation_type=step.transformation_type,
            transformation_config=step.transformation_config
        )
        steps_data.append(step_create)
    
    pipeline_data = PipelineCreate(
        name=clone_name,
        description=f"Cloned from: {original_pipeline.description}" if original_pipeline.description else None,
        pipeline_config=original_pipeline.pipeline_config,
        schedule_cron=None,  # Don't copy scheduling
        is_scheduled=False,  # Don't copy scheduling
        tags=original_pipeline.tags,
        steps=steps_data
    )
    
    try:
        cloned_pipeline = await service.create_pipeline(
            pipeline_data=pipeline_data,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        return cloned_pipeline
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{pipeline_id}/status")
async def update_pipeline_status(
    pipeline_id: uuid.UUID,
    new_status: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update only the pipeline status."""
    
    from ....schemas.pipeline import PipelineStatusEnum
    
    try:
        # Validate status
        status_enum = PipelineStatusEnum(new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )
    
    service = PipelineService(db)
    
    update_data = PipelineUpdate(status=status_enum)
    
    pipeline = await service.update_pipeline(
        pipeline_id=pipeline_id,
        pipeline_data=update_data,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )
    
    return {"message": f"Pipeline status updated to {new_status}", "pipeline_id": pipeline_id}


@router.get("/{pipeline_id}/statistics")
async def get_pipeline_statistics(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed statistics for a pipeline."""
    
    service = PipelineService(db)
    
    pipeline = await service.get_pipeline(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found"
        )
    
    # Get execution statistics
    from sqlalchemy import func, case
    from ....models.pipeline import PipelineExecution, ExecutionStatus
    
    execution_stats = db.query(
        func.count(PipelineExecution.id).label('total_executions'),
        func.count(case((PipelineExecution.status == ExecutionStatus.COMPLETED, 1))).label('successful_executions'),
        func.count(case((PipelineExecution.status == ExecutionStatus.FAILED, 1))).label('failed_executions'),
        func.avg(PipelineExecution.rows_processed).label('avg_rows_processed'),
        func.max(PipelineExecution.created_at).label('last_execution')
    ).filter(
        PipelineExecution.pipeline_id == pipeline_id
    ).first()
    
    return {
        "pipeline_id": pipeline_id,
        "total_executions": execution_stats.total_executions or 0,
        "successful_executions": execution_stats.successful_executions or 0,
        "failed_executions": execution_stats.failed_executions or 0,
        "success_rate": (
            (execution_stats.successful_executions / execution_stats.total_executions * 100)
            if execution_stats.total_executions > 0 else 0
        ),
        "avg_rows_processed": float(execution_stats.avg_rows_processed or 0),
        "last_execution": execution_stats.last_execution,
        "step_count": len(pipeline.steps),
        "is_scheduled": pipeline.is_scheduled,
        "next_run": pipeline.next_run
    }
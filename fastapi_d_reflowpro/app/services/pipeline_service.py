from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, desc, select
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from ..models.pipeline import ETLPipeline, PipelineStep, PipelineExecution, PipelineStatus, ExecutionStatus
from ..models.user import User
from ..schemas.pipeline import (
    PipelineCreate, PipelineUpdate, PipelineSearchRequest,
    PipelineExecutionCreate, PipelineListResponse
)


class PipelineService:
    """Service layer for pipeline operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_pipeline(
        self, 
        pipeline_data: PipelineCreate, 
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None
    ) -> ETLPipeline:
        """Create a new pipeline."""
        
        # Create the main pipeline
        pipeline = ETLPipeline(
            name=pipeline_data.name,
            description=pipeline_data.description,
            status=pipeline_data.status or PipelineStatus.DRAFT,
            pipeline_config=pipeline_data.pipeline_config,
            schedule_cron=pipeline_data.schedule_cron,
            is_scheduled=pipeline_data.is_scheduled,
            organization_id=organization_id,
            created_by_id=user_id,
            tags=pipeline_data.tags or [],
            version=1
        )
        
        self.db.add(pipeline)
        await self.db.flush()  # Get the ID
        
        # Add pipeline steps if provided
        if pipeline_data.steps:
            for step_data in pipeline_data.steps:
                step = PipelineStep(
                    pipeline_id=pipeline.id,
                    step_order=step_data.step_order,
                    step_type=step_data.step_type,
                    step_name=step_data.step_name,
                    step_config=step_data.step_config,
                    source_connector_id=step_data.source_connector_id,
                    transformation_type=step_data.transformation_type,
                    transformation_config=step_data.transformation_config
                )
                self.db.add(step)
        
        await self.db.commit()
        
        # Reload pipeline with relationships eagerly loaded
        query = select(ETLPipeline).options(selectinload(ETLPipeline.steps)).where(ETLPipeline.id == pipeline.id)
        result = await self.db.execute(query)
        pipeline_with_steps = result.scalar_one()
        
        return pipeline_with_steps
    
    async def get_pipeline(
        self, 
        pipeline_id: uuid.UUID, 
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None
    ) -> Optional[ETLPipeline]:
        """Get a specific pipeline by ID."""
        
        query = select(ETLPipeline).options(selectinload(ETLPipeline.steps)).where(ETLPipeline.id == pipeline_id)
        
        # Apply access control
        if organization_id:
            query = query.where(ETLPipeline.organization_id == organization_id)
        else:
            query = query.where(ETLPipeline.created_by_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_pipelines(
        self,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
        search_request: Optional[PipelineSearchRequest] = None
    ) -> tuple[List[ETLPipeline], int]:
        """Get pipelines with optional filtering and pagination."""
        
        query = select(ETLPipeline).options(selectinload(ETLPipeline.steps))
        
        # Apply access control
        if organization_id:
            query = query.where(ETLPipeline.organization_id == organization_id)
        else:
            query = query.where(ETLPipeline.created_by_id == user_id)
        
        # Apply filters if search request provided
        if search_request:
            if search_request.search:
                search_term = f"%{search_request.search}%"
                query = query.where(
                    or_(
                        ETLPipeline.name.ilike(search_term),
                        ETLPipeline.description.ilike(search_term)
                    )
                )
            
            if search_request.status:
                query = query.where(ETLPipeline.status.in_(search_request.status))
            
            if search_request.is_scheduled is not None:
                query = query.where(ETLPipeline.is_scheduled == search_request.is_scheduled)
            
            if search_request.created_after:
                query = query.where(ETLPipeline.created_at >= search_request.created_after)
            
            if search_request.created_before:
                query = query.where(ETLPipeline.created_at <= search_request.created_before)
        
        # Get total count
        count_query = select(func.count(ETLPipeline.id)).select_from(query)
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        # Apply pagination and ordering
        if search_request:
            query = query.offset(search_request.offset).limit(search_request.limit)
        
        query = query.order_by(desc(ETLPipeline.created_at))
        
        result = await self.db.execute(query)
        pipelines = result.scalars().all()
        
        return pipelines, total
    
    async def update_pipeline(
        self,
        pipeline_id: uuid.UUID,
        pipeline_data: PipelineUpdate,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None
    ) -> Optional[ETLPipeline]:
        """Update an existing pipeline."""
        
        pipeline = await self.get_pipeline(pipeline_id, user_id, organization_id)
        if not pipeline:
            return None
        
        # Update basic fields
        update_data = pipeline_data.model_dump(exclude_unset=True, exclude={'steps'})
        for field, value in update_data.items():
            setattr(pipeline, field, value)
        
        # Update version
        pipeline.version += 1
        
        # Handle steps update if provided
        if pipeline_data.steps is not None:
            # Remove existing steps
            steps_query = select(PipelineStep).where(PipelineStep.pipeline_id == pipeline_id)
            steps_result = await self.db.execute(steps_query)
            existing_steps = steps_result.scalars().all()
            
            for step in existing_steps:
                await self.db.delete(step)
            
            # Add new steps
            for step_data in pipeline_data.steps:
                step = PipelineStep(
                    pipeline_id=pipeline.id,
                    step_order=step_data.step_order,
                    step_type=step_data.step_type,
                    step_name=step_data.step_name,
                    step_config=step_data.step_config,
                    source_connector_id=step_data.source_connector_id,
                    transformation_type=step_data.transformation_type,
                    transformation_config=step_data.transformation_config
                )
                self.db.add(step)
        
        await self.db.commit()
        
        # Reload pipeline with relationships eagerly loaded  
        query = select(ETLPipeline).options(selectinload(ETLPipeline.steps)).where(ETLPipeline.id == pipeline.id)
        result = await self.db.execute(query)
        pipeline_with_steps = result.scalar_one()
        
        return pipeline_with_steps
    
    async def delete_pipeline(
        self,
        pipeline_id: uuid.UUID,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Delete a pipeline."""
        
        pipeline = await self.get_pipeline(pipeline_id, user_id, organization_id)
        if not pipeline:
            return False
        
        # Check if pipeline is currently running
        if pipeline.status == PipelineStatus.RUNNING:
            raise ValueError("Cannot delete a running pipeline")
        
        await self.db.delete(pipeline)
        await self.db.commit()
        return True
    
    async def execute_pipeline(
        self,
        pipeline_id: uuid.UUID,
        execution_data: PipelineExecutionCreate,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None
    ) -> Optional[PipelineExecution]:
        """Create a new pipeline execution."""
        
        pipeline = await self.get_pipeline(pipeline_id, user_id, organization_id)
        if not pipeline:
            return None
        
        # Check if pipeline is in valid state for execution
        if pipeline.status not in [PipelineStatus.ACTIVE, PipelineStatus.DRAFT]:
            raise ValueError(f"Cannot execute pipeline in {pipeline.status} status")
        
        # Create execution record
        execution = PipelineExecution(
            pipeline_id=pipeline_id,
            status=ExecutionStatus.PENDING,
            started_by_id=user_id,
            trigger_type=execution_data.trigger_type or "manual",
            trigger_data=execution_data.trigger_data
        )
        
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)
        
        # TODO: Enqueue actual pipeline execution job
        # This would integrate with the Celery background tasks
        
        return execution
    
    async def get_pipeline_executions(
        self,
        pipeline_id: uuid.UUID,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[List[PipelineExecution], int]:
        """Get execution history for a pipeline."""
        
        # Verify pipeline access
        pipeline = await self.get_pipeline(pipeline_id, user_id, organization_id)
        if not pipeline:
            return [], 0
        
        query = select(PipelineExecution).where(
            PipelineExecution.pipeline_id == pipeline_id
        )
        
        # Count total
        count_query = select(func.count(PipelineExecution.id)).where(
            PipelineExecution.pipeline_id == pipeline_id
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        # Get executions with pagination
        query = query.order_by(desc(PipelineExecution.created_at)).offset(offset).limit(limit)
        result = await self.db.execute(query)
        executions = result.scalars().all()
        
        return executions, total
    
    async def get_pipeline_list_with_stats(
        self,
        user_id: uuid.UUID,
        organization_id: Optional[uuid.UUID] = None,
        search_request: Optional[PipelineSearchRequest] = None
    ) -> tuple[List[PipelineListResponse], int]:
        """Get pipelines with additional statistics for list view."""
        
        # For now, just get basic pipelines and enhance later
        pipelines, total = await self.get_pipelines(user_id, organization_id, search_request)
        
        pipeline_responses = []
        for pipeline in pipelines:
            # Get step count
            step_count_query = select(func.count(PipelineStep.id)).where(
                PipelineStep.pipeline_id == pipeline.id
            )
            step_count_result = await self.db.execute(step_count_query)
            step_count = step_count_result.scalar()
            
            # Get last execution info
            last_execution_query = (
                select(PipelineExecution)
                .where(PipelineExecution.pipeline_id == pipeline.id)
                .order_by(desc(PipelineExecution.created_at))
                .limit(1)
            )
            last_execution_result = await self.db.execute(last_execution_query)
            last_execution = last_execution_result.scalar_one_or_none()
            
            pipeline_response = PipelineListResponse(
                id=pipeline.id,
                name=pipeline.name,
                description=pipeline.description,
                status=pipeline.status,
                is_scheduled=pipeline.is_scheduled,
                next_run=pipeline.next_run,
                created_at=pipeline.created_at,
                updated_at=pipeline.updated_at,
                step_count=step_count,
                last_execution=last_execution.created_at if last_execution else None,
                last_execution_status=last_execution.status if last_execution else None
            )
            pipeline_responses.append(pipeline_response)
        
        return pipeline_responses, total
    
    async def validate_pipeline_config(
        self,
        pipeline_config: Dict[str, Any],
        steps: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate pipeline configuration."""
        
        errors = []
        warnings = []
        suggestions = []
        
        # Basic validation
        if not steps:
            errors.append("Pipeline must have at least one step")
        
        # Check step order
        if steps:
            orders = [step.get("step_order", 0) for step in steps]
            if len(set(orders)) != len(orders):
                errors.append("Step orders must be unique")
            
            if min(orders) != 0:
                warnings.append("Step ordering should start from 0")
        
        # Check for source and destination steps
        step_types = [step.get("step_type", "") for step in steps]
        if "source" not in step_types:
            errors.append("Pipeline must have at least one source step")
        
        if "destination" not in step_types:
            warnings.append("Pipeline should have at least one destination step")
        
        # Performance suggestions
        if len(steps) > 10:
            suggestions.append("Consider breaking complex pipelines into smaller ones for better maintainability")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "suggestions": suggestions
        }
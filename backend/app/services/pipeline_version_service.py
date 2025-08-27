"""
Pipeline Version Management Service

Handles version control for ETL pipelines including creation, rollback,
comparison, and checkpoint management.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import json
from difflib import SequenceMatcher

from ..models.pipeline import ETLPipeline, PipelineStep
from ..models.pipeline_version import PipelineVersion, PipelineVersionComparison, PipelineCheckpoint
from ..core.cache_manager import cache_manager
import logging

logger = logging.getLogger(__name__)


class PipelineVersionService:
    """Service for managing pipeline versions."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_version(
        self,
        pipeline_id: uuid.UUID,
        user_id: uuid.UUID,
        change_notes: Optional[str] = None,
        is_draft: bool = True
    ) -> PipelineVersion:
        """Create a new version of a pipeline."""
        
        # Get current pipeline
        pipeline = await self.db.get(ETLPipeline, pipeline_id)
        if not pipeline:
            raise ValueError(f"Pipeline {pipeline_id} not found")
        
        # Get current version number
        result = await self.db.execute(
            select(func.max(PipelineVersion.version_number))
            .where(PipelineVersion.pipeline_id == pipeline_id)
        )
        current_version = result.scalar() or 0
        new_version_number = current_version + 1
        
        # Get pipeline steps
        steps_result = await self.db.execute(
            select(PipelineStep)
            .where(PipelineStep.pipeline_id == pipeline_id)
            .order_by(PipelineStep.step_order)
        )
        steps = steps_result.scalars().all()
        
        # Create steps configuration
        steps_config = [
            {
                "step_order": step.step_order,
                "step_type": step.step_type,
                "step_name": step.step_name,
                "step_config": step.step_config,
                "source_connector_id": str(step.source_connector_id) if step.source_connector_id else None,
                "transformation_type": step.transformation_type,
                "transformation_config": step.transformation_config
            }
            for step in steps
        ]
        
        # Create new version
        new_version = PipelineVersion(
            pipeline_id=pipeline_id,
            version_number=new_version_number,
            name=f"{pipeline.name} v{new_version_number}",
            description=pipeline.description,
            change_notes=change_notes,
            pipeline_config=pipeline.pipeline_config,
            steps_config=steps_config,
            is_draft=is_draft,
            is_active=False,
            created_by_id=user_id,
            created_from_version=current_version if current_version > 0 else None
        )
        
        self.db.add(new_version)
        
        # If not draft, deactivate other versions
        if not is_draft:
            await self._deactivate_other_versions(pipeline_id, new_version.id)
            new_version.is_active = True
            new_version.published_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(new_version)
        
        # Invalidate cache
        await cache_manager.invalidate_by_tag(f"pipeline:{pipeline_id}")
        
        logger.info(f"Created version {new_version_number} for pipeline {pipeline_id}")
        
        return new_version
    
    async def publish_version(
        self,
        version_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> PipelineVersion:
        """Publish a draft version."""
        
        version = await self.db.get(PipelineVersion, version_id)
        if not version:
            raise ValueError(f"Version {version_id} not found")
        
        if not version.is_draft:
            raise ValueError("Version is already published")
        
        # Deactivate other versions
        await self._deactivate_other_versions(version.pipeline_id, version_id)
        
        # Publish this version
        version.is_draft = False
        version.is_published = True
        version.is_active = True
        version.published_at = datetime.utcnow()
        
        # Update main pipeline version
        pipeline = await self.db.get(ETLPipeline, version.pipeline_id)
        pipeline.version = version.version_number
        pipeline.pipeline_config = version.pipeline_config
        
        await self.db.commit()
        await self.db.refresh(version)
        
        # Invalidate cache
        await cache_manager.invalidate_by_tag(f"pipeline:{version.pipeline_id}")
        
        logger.info(f"Published version {version.version_number} for pipeline {version.pipeline_id}")
        
        return version
    
    async def rollback_to_version(
        self,
        pipeline_id: uuid.UUID,
        target_version: int,
        user_id: uuid.UUID,
        rollback_notes: Optional[str] = None
    ) -> PipelineVersion:
        """Rollback pipeline to a specific version."""
        
        # Get target version
        result = await self.db.execute(
            select(PipelineVersion)
            .where(and_(
                PipelineVersion.pipeline_id == pipeline_id,
                PipelineVersion.version_number == target_version
            ))
        )
        target_version_obj = result.scalar_one_or_none()
        
        if not target_version_obj:
            raise ValueError(f"Version {target_version} not found for pipeline {pipeline_id}")
        
        if not target_version_obj.is_rollback_safe:
            raise ValueError(f"Version {target_version} is not safe for rollback")
        
        # Create new version as rollback
        rollback_version = await self.create_version(
            pipeline_id=pipeline_id,
            user_id=user_id,
            change_notes=f"Rollback to version {target_version}. {rollback_notes or ''}",
            is_draft=False
        )
        
        # Copy configuration from target version
        rollback_version.pipeline_config = target_version_obj.pipeline_config
        rollback_version.steps_config = target_version_obj.steps_config
        
        # Update main pipeline
        pipeline = await self.db.get(ETLPipeline, pipeline_id)
        pipeline.pipeline_config = target_version_obj.pipeline_config
        
        # Recreate pipeline steps
        await self.db.execute(
            select(PipelineStep).where(PipelineStep.pipeline_id == pipeline_id)
        )
        
        # Clear existing steps
        pipeline.steps.clear()
        
        # Recreate steps from version
        if target_version_obj.steps_config:
            for step_config in target_version_obj.steps_config:
                step = PipelineStep(
                    pipeline_id=pipeline_id,
                    step_order=step_config["step_order"],
                    step_type=step_config["step_type"],
                    step_name=step_config["step_name"],
                    step_config=step_config.get("step_config"),
                    source_connector_id=uuid.UUID(step_config["source_connector_id"]) if step_config.get("source_connector_id") else None,
                    transformation_type=step_config.get("transformation_type"),
                    transformation_config=step_config.get("transformation_config")
                )
                self.db.add(step)
        
        await self.db.commit()
        
        logger.info(f"Rolled back pipeline {pipeline_id} to version {target_version}")
        
        return rollback_version
    
    async def compare_versions(
        self,
        pipeline_id: uuid.UUID,
        version_from: int,
        version_to: int,
        user_id: uuid.UUID
    ) -> PipelineVersionComparison:
        """Compare two versions of a pipeline."""
        
        # Get both versions
        result = await self.db.execute(
            select(PipelineVersion)
            .where(and_(
                PipelineVersion.pipeline_id == pipeline_id,
                PipelineVersion.version_number.in_([version_from, version_to])
            ))
        )
        versions = {v.version_number: v for v in result.scalars().all()}
        
        if len(versions) != 2:
            raise ValueError("One or both versions not found")
        
        v_from = versions[version_from]
        v_to = versions[version_to]
        
        # Compare configurations
        changes = self._calculate_changes(v_from, v_to)
        
        # Determine change type
        change_type = self._determine_change_type(changes)
        
        # Check for breaking changes
        breaking_changes = self._has_breaking_changes(changes)
        
        # Create comparison record
        comparison = PipelineVersionComparison(
            pipeline_id=pipeline_id,
            version_from=version_from,
            version_to=version_to,
            changes=changes,
            change_type=change_type,
            breaking_changes=breaking_changes,
            data_format_changes=changes.get("data_format_changes", False),
            performance_impact=self._assess_performance_impact(v_from, v_to),
            compared_by_id=user_id
        )
        
        self.db.add(comparison)
        await self.db.commit()
        await self.db.refresh(comparison)
        
        return comparison
    
    async def create_checkpoint(
        self,
        pipeline_id: uuid.UUID,
        execution_id: uuid.UUID,
        version_id: uuid.UUID,
        step_index: int,
        checkpoint_data: Dict[str, Any],
        rows_processed: int = 0,
        expires_in_hours: int = 24
    ) -> PipelineCheckpoint:
        """Create a checkpoint for pipeline execution."""
        
        checkpoint = PipelineCheckpoint(
            pipeline_id=pipeline_id,
            execution_id=execution_id,
            version_id=version_id,
            step_index=step_index,
            checkpoint_data=checkpoint_data,
            rows_processed=rows_processed,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
        )
        
        self.db.add(checkpoint)
        await self.db.commit()
        await self.db.refresh(checkpoint)
        
        logger.info(f"Created checkpoint for execution {execution_id} at step {step_index}")
        
        return checkpoint
    
    async def get_latest_checkpoint(
        self,
        execution_id: uuid.UUID
    ) -> Optional[PipelineCheckpoint]:
        """Get the latest valid checkpoint for an execution."""
        
        result = await self.db.execute(
            select(PipelineCheckpoint)
            .where(and_(
                PipelineCheckpoint.execution_id == execution_id,
                PipelineCheckpoint.is_valid == True,
                PipelineCheckpoint.expires_at > datetime.utcnow()
            ))
            .order_by(PipelineCheckpoint.step_index.desc())
            .limit(1)
        )
        
        return result.scalar_one_or_none()
    
    async def cleanup_old_checkpoints(self, days_to_keep: int = 7):
        """Clean up old checkpoints."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        result = await self.db.execute(
            select(PipelineCheckpoint)
            .where(PipelineCheckpoint.created_at < cutoff_date)
        )
        
        old_checkpoints = result.scalars().all()
        for checkpoint in old_checkpoints:
            await self.db.delete(checkpoint)
        
        await self.db.commit()
        
        logger.info(f"Cleaned up {len(old_checkpoints)} old checkpoints")
    
    async def _deactivate_other_versions(
        self,
        pipeline_id: uuid.UUID,
        except_version_id: uuid.UUID
    ):
        """Deactivate all other versions of a pipeline."""
        
        result = await self.db.execute(
            select(PipelineVersion)
            .where(and_(
                PipelineVersion.pipeline_id == pipeline_id,
                PipelineVersion.id != except_version_id,
                PipelineVersion.is_active == True
            ))
        )
        
        active_versions = result.scalars().all()
        for version in active_versions:
            version.is_active = False
    
    def _calculate_changes(
        self,
        v_from: PipelineVersion,
        v_to: PipelineVersion
    ) -> Dict[str, Any]:
        """Calculate differences between two versions."""
        
        changes = {
            "config_changes": [],
            "steps_added": [],
            "steps_removed": [],
            "steps_modified": [],
            "data_format_changes": False
        }
        
        # Compare pipeline configs
        if v_from.pipeline_config != v_to.pipeline_config:
            changes["config_changes"] = self._diff_configs(
                v_from.pipeline_config or {},
                v_to.pipeline_config or {}
            )
        
        # Compare steps
        from_steps = {s["step_order"]: s for s in (v_from.steps_config or [])}
        to_steps = {s["step_order"]: s for s in (v_to.steps_config or [])}
        
        # Find added steps
        for order, step in to_steps.items():
            if order not in from_steps:
                changes["steps_added"].append(step)
        
        # Find removed steps
        for order, step in from_steps.items():
            if order not in to_steps:
                changes["steps_removed"].append(step)
        
        # Find modified steps
        for order in set(from_steps.keys()) & set(to_steps.keys()):
            if from_steps[order] != to_steps[order]:
                changes["steps_modified"].append({
                    "step_order": order,
                    "from": from_steps[order],
                    "to": to_steps[order]
                })
        
        return changes
    
    def _diff_configs(self, config1: Dict, config2: Dict) -> List[Dict]:
        """Calculate differences between two configurations."""
        
        differences = []
        all_keys = set(config1.keys()) | set(config2.keys())
        
        for key in all_keys:
            val1 = config1.get(key)
            val2 = config2.get(key)
            
            if val1 != val2:
                differences.append({
                    "key": key,
                    "from": val1,
                    "to": val2
                })
        
        return differences
    
    def _determine_change_type(self, changes: Dict[str, Any]) -> str:
        """Determine if changes are major, minor, or patch."""
        
        if changes["steps_removed"] or changes.get("breaking_changes"):
            return "major"
        elif changes["steps_added"] or changes["steps_modified"]:
            return "minor"
        elif changes["config_changes"]:
            return "patch"
        else:
            return "none"
    
    def _has_breaking_changes(self, changes: Dict[str, Any]) -> bool:
        """Check if changes contain breaking changes."""
        
        # Removing steps is breaking
        if changes["steps_removed"]:
            return True
        
        # Major config changes might be breaking
        for change in changes.get("config_changes", []):
            if change["key"] in ["data_format", "output_schema", "required_fields"]:
                return True
        
        return False
    
    def _assess_performance_impact(
        self,
        v_from: PipelineVersion,
        v_to: PipelineVersion
    ) -> str:
        """Assess performance impact of version change."""
        
        # Compare average execution times if available
        if v_from.avg_execution_time and v_to.avg_execution_time:
            diff_percent = ((v_to.avg_execution_time - v_from.avg_execution_time) / v_from.avg_execution_time) * 100
            
            if diff_percent < -10:
                return "positive"
            elif diff_percent > 10:
                return "negative"
        
        return "neutral"
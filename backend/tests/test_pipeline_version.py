"""
Tests for pipeline versioning functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
import uuid
from app.services.pipeline_version_service import PipelineVersionService
from app.models.pipeline_version import PipelineVersion, PipelineCheckpoint


@pytest.fixture
async def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.get = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
async def version_service(mock_db_session):
    """Create a pipeline version service instance."""
    return PipelineVersionService(mock_db_session)


@pytest.mark.asyncio
async def test_create_version(version_service, mock_db_session):
    """Test creating a new pipeline version."""
    pipeline_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    # Mock pipeline
    mock_pipeline = MagicMock()
    mock_pipeline.name = "Test Pipeline"
    mock_pipeline.description = "Test Description"
    mock_pipeline.pipeline_config = {"key": "value"}
    
    mock_db_session.get.return_value = mock_pipeline
    
    # Mock current version query
    mock_result = MagicMock()
    mock_result.scalar.return_value = 2  # Current version is 2
    mock_db_session.execute.return_value = mock_result
    
    # Mock steps
    mock_steps_result = MagicMock()
    mock_step = MagicMock()
    mock_step.step_order = 1
    mock_step.step_type = "source"
    mock_step.step_name = "Test Step"
    mock_step.step_config = {}
    mock_step.source_connector_id = None
    mock_step.transformation_type = None
    mock_step.transformation_config = None
    
    mock_steps_result.scalars.return_value.all.return_value = [mock_step]
    mock_db_session.execute.return_value = mock_steps_result
    
    # Create version
    version = await version_service.create_version(
        pipeline_id=pipeline_id,
        user_id=user_id,
        change_notes="Test version",
        is_draft=True
    )
    
    # Verify version creation
    assert mock_db_session.add.called
    assert mock_db_session.commit.called
    
    # Check the added version
    added_version = mock_db_session.add.call_args[0][0]
    assert added_version.pipeline_id == pipeline_id
    assert added_version.version_number == 3  # Should be incremented
    assert added_version.is_draft is True
    assert added_version.is_active is False


@pytest.mark.asyncio
async def test_publish_version(version_service, mock_db_session):
    """Test publishing a draft version."""
    version_id = uuid.uuid4()
    user_id = uuid.uuid4()
    pipeline_id = uuid.uuid4()
    
    # Mock version
    mock_version = MagicMock(spec=PipelineVersion)
    mock_version.id = version_id
    mock_version.pipeline_id = pipeline_id
    mock_version.is_draft = True
    mock_version.version_number = 2
    mock_version.pipeline_config = {"key": "value"}
    
    mock_db_session.get.side_effect = [mock_version, MagicMock()]  # Version, then pipeline
    
    # Mock other active versions
    mock_active_version = MagicMock()
    mock_active_version.is_active = True
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_active_version]
    mock_db_session.execute.return_value = mock_result
    
    # Publish version
    published = await version_service.publish_version(version_id, user_id)
    
    # Verify version was published
    assert mock_version.is_draft is False
    assert mock_version.is_published is True
    assert mock_version.is_active is True
    assert mock_active_version.is_active is False
    assert mock_db_session.commit.called


@pytest.mark.asyncio
async def test_rollback_to_version(version_service, mock_db_session):
    """Test rolling back to a previous version."""
    pipeline_id = uuid.uuid4()
    user_id = uuid.uuid4()
    target_version = 2
    
    # Mock target version
    mock_target_version = MagicMock(spec=PipelineVersion)
    mock_target_version.version_number = target_version
    mock_target_version.is_rollback_safe = True
    mock_target_version.pipeline_config = {"key": "old_value"}
    mock_target_version.steps_config = [
        {
            "step_order": 1,
            "step_type": "source",
            "step_name": "Old Step",
            "step_config": {},
            "source_connector_id": None,
            "transformation_type": None,
            "transformation_config": None
        }
    ]
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_target_version
    mock_db_session.execute.return_value = mock_result
    
    # Mock pipeline
    mock_pipeline = MagicMock()
    mock_pipeline.steps = MagicMock()
    mock_db_session.get.return_value = mock_pipeline
    
    # Mock create_version (called internally)
    with patch.object(version_service, 'create_version') as mock_create:
        mock_rollback_version = MagicMock()
        mock_create.return_value = mock_rollback_version
        
        # Perform rollback
        result = await version_service.rollback_to_version(
            pipeline_id=pipeline_id,
            target_version=target_version,
            user_id=user_id,
            rollback_notes="Rolling back due to issues"
        )
        
        # Verify rollback
        assert mock_create.called
        assert result == mock_rollback_version
        assert mock_rollback_version.pipeline_config == mock_target_version.pipeline_config
        assert mock_rollback_version.steps_config == mock_target_version.steps_config
        assert mock_pipeline.pipeline_config == mock_target_version.pipeline_config


@pytest.mark.asyncio
async def test_create_checkpoint(version_service, mock_db_session):
    """Test creating a checkpoint for pipeline execution."""
    pipeline_id = uuid.uuid4()
    execution_id = uuid.uuid4()
    version_id = uuid.uuid4()
    
    checkpoint_data = {
        "state": "processing",
        "last_processed_id": 1000
    }
    
    # Create checkpoint
    checkpoint = await version_service.create_checkpoint(
        pipeline_id=pipeline_id,
        execution_id=execution_id,
        version_id=version_id,
        step_index=3,
        checkpoint_data=checkpoint_data,
        rows_processed=500,
        expires_in_hours=24
    )
    
    # Verify checkpoint creation
    assert mock_db_session.add.called
    assert mock_db_session.commit.called
    
    # Check the added checkpoint
    added_checkpoint = mock_db_session.add.call_args[0][0]
    assert added_checkpoint.pipeline_id == pipeline_id
    assert added_checkpoint.execution_id == execution_id
    assert added_checkpoint.version_id == version_id
    assert added_checkpoint.step_index == 3
    assert added_checkpoint.checkpoint_data == checkpoint_data
    assert added_checkpoint.rows_processed == 500


@pytest.mark.asyncio
async def test_compare_versions(version_service, mock_db_session):
    """Test comparing two pipeline versions."""
    pipeline_id = uuid.uuid4()
    user_id = uuid.uuid4()
    
    # Mock versions
    v1 = MagicMock(spec=PipelineVersion)
    v1.version_number = 1
    v1.pipeline_config = {"key": "value1"}
    v1.steps_config = [{"step_order": 1, "step_name": "Step1"}]
    v1.avg_execution_time = 100
    
    v2 = MagicMock(spec=PipelineVersion)
    v2.version_number = 2
    v2.pipeline_config = {"key": "value2"}
    v2.steps_config = [
        {"step_order": 1, "step_name": "Step1"},
        {"step_order": 2, "step_name": "Step2"}
    ]
    v2.avg_execution_time = 80
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [v1, v2]
    mock_db_session.execute.return_value = mock_result
    
    # Compare versions
    comparison = await version_service.compare_versions(
        pipeline_id=pipeline_id,
        version_from=1,
        version_to=2,
        user_id=user_id
    )
    
    # Verify comparison was created
    assert mock_db_session.add.called
    assert mock_db_session.commit.called
    
    # Check the comparison
    added_comparison = mock_db_session.add.call_args[0][0]
    assert added_comparison.pipeline_id == pipeline_id
    assert added_comparison.version_from == 1
    assert added_comparison.version_to == 2
    assert added_comparison.changes is not None
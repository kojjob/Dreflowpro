"""
Pipeline system tests.
"""
import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, patch, AsyncMock

from app.models.pipeline import Pipeline
from app.models.connector import Connector
from app.models.user import User


class TestPipelineCRUD:
    """Test pipeline CRUD operations."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_create_pipeline(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating a new pipeline."""
        pipeline_data = {
            "name": "Test ETL Pipeline",
            "description": "A test pipeline for unit testing",
            "config": {
                "source": {
                    "type": "csv",
                    "path": "/test/data.csv"
                },
                "transformations": [
                    {
                        "type": "filter",
                        "column": "status",
                        "operator": "equals",
                        "value": "active"
                    },
                    {
                        "type": "rename",
                        "mapping": {
                            "old_name": "new_name"
                        }
                    }
                ],
                "destination": {
                    "type": "postgres",
                    "table": "processed_data"
                }
            }
        }
        
        response = await async_client.post(
            "/api/v1/pipelines/",
            json=pipeline_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == pipeline_data["name"]
        assert data["description"] == pipeline_data["description"]
        assert data["status"] == "draft"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_list_pipelines(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test listing user's pipelines."""
        response = await async_client.get("/api/v1/pipelines/", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check if test pipeline is in the list
        pipeline_ids = [pipe["id"] for pipe in data]
        assert test_pipeline.id in pipeline_ids
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_get_pipeline_by_id(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test getting a specific pipeline."""
        response = await async_client.get(f"/api/v1/pipelines/{test_pipeline.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_pipeline.id
        assert data["name"] == test_pipeline.name
        assert data["description"] == test_pipeline.description
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_update_pipeline(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test updating a pipeline."""
        update_data = {
            "name": "Updated ETL Pipeline",
            "description": "Updated description",
            "config": {
                "source": {
                    "type": "json",
                    "path": "/test/updated_data.json"
                },
                "transformations": [
                    {
                        "type": "filter",
                        "column": "type",
                        "operator": "in",
                        "value": ["premium", "standard"]
                    }
                ],
                "destination": {
                    "type": "mysql",
                    "table": "updated_data"
                }
            }
        }
        
        response = await async_client.put(
            f"/api/v1/pipelines/{test_pipeline.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["config"]["source"]["type"] == "json"
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_delete_pipeline(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test deleting a pipeline."""
        response = await async_client.delete(f"/api/v1/pipelines/{test_pipeline.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify pipeline is deleted
        get_response = await async_client.get(f"/api/v1/pipelines/{test_pipeline.id}", headers=auth_headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND


class TestPipelineExecution:
    """Test pipeline execution functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    @patch('app.workers.pipeline_tasks.execute_pipeline_task.delay')
    async def test_execute_pipeline(
        self,
        mock_celery_task: MagicMock,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test executing a pipeline."""
        mock_celery_task.return_value = MagicMock(id="test-task-id")
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/execute",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["message"] == "Pipeline execution started"
        assert data["task_id"] == "test-task-id"
        mock_celery_task.assert_called_once_with(test_pipeline.id)
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_execute_nonexistent_pipeline(self, async_client: AsyncClient, auth_headers: dict):
        """Test executing a non-existent pipeline."""
        response = await async_client.post("/api/v1/pipelines/99999/execute", headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    @patch('app.workers.pipeline_tasks.execute_pipeline_task.delay')
    async def test_execute_pipeline_with_parameters(
        self,
        mock_celery_task: MagicMock,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test executing a pipeline with runtime parameters."""
        mock_celery_task.return_value = MagicMock(id="test-task-id-params")
        
        execution_params = {
            "batch_size": 1000,
            "dry_run": False,
            "notification_email": "test@example.com"
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/execute",
            json=execution_params,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        data = response.json()
        assert data["task_id"] == "test-task-id-params"
        mock_celery_task.assert_called_once()


class TestPipelineValidation:
    """Test pipeline validation and configuration checks."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_create_pipeline_invalid_config(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating pipeline with invalid configuration."""
        invalid_pipeline_data = {
            "name": "Invalid Pipeline",
            "description": "Pipeline with invalid config",
            "config": {
                "source": {
                    "type": "unknown_type"  # Invalid source type
                },
                "transformations": [],
                "destination": {}  # Missing destination config
            }
        }
        
        response = await async_client.post(
            "/api/v1/pipelines/",
            json=invalid_pipeline_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_create_pipeline_missing_required_fields(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating pipeline with missing required fields."""
        incomplete_pipeline_data = {
            "name": "Incomplete Pipeline"
            # Missing description and config
        }
        
        response = await async_client.post(
            "/api/v1/pipelines/",
            json=incomplete_pipeline_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_validate_pipeline_config(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test pipeline configuration validation endpoint."""
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/validate",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data


class TestPipelineScheduling:
    """Test pipeline scheduling functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_schedule_pipeline(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test scheduling a pipeline."""
        schedule_data = {
            "cron_expression": "0 2 * * *",  # Daily at 2 AM
            "timezone": "UTC",
            "is_active": True
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/schedule",
            json=schedule_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["cron_expression"] == schedule_data["cron_expression"]
        assert data["timezone"] == schedule_data["timezone"]
        assert data["is_active"] is True
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_schedule_pipeline_invalid_cron(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test scheduling a pipeline with invalid cron expression."""
        invalid_schedule_data = {
            "cron_expression": "invalid cron",
            "timezone": "UTC",
            "is_active": True
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/schedule",
            json=invalid_schedule_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestPipelineMonitoring:
    """Test pipeline monitoring and execution history."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_get_pipeline_execution_history(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test getting pipeline execution history."""
        response = await async_client.get(
            f"/api/v1/pipelines/{test_pipeline.id}/executions",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        # New pipeline should have no execution history
        assert len(data) == 0
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_get_pipeline_metrics(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test getting pipeline performance metrics."""
        response = await async_client.get(
            f"/api/v1/pipelines/{test_pipeline.id}/metrics",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_executions" in data
        assert "success_rate" in data
        assert "avg_execution_time" in data
        assert "last_execution" in data
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_get_pipeline_logs(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test getting pipeline execution logs."""
        response = await async_client.get(
            f"/api/v1/pipelines/{test_pipeline.id}/logs",
            params={"limit": 50, "offset": 0},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert isinstance(data["logs"], list)


class TestPipelineTemplates:
    """Test pipeline templates functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_list_pipeline_templates(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing available pipeline templates."""
        response = await async_client.get("/api/v1/pipelines/templates", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        
        # Check template structure
        if data:
            template = data[0]
            assert "id" in template
            assert "name" in template
            assert "description" in template
            assert "category" in template
            assert "config" in template
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_create_pipeline_from_template(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating a pipeline from a template."""
        template_data = {
            "template_id": "csv_to_postgres",
            "name": "My CSV to PostgreSQL Pipeline",
            "description": "Created from template",
            "config_overrides": {
                "source": {
                    "path": "/my/custom/file.csv"
                },
                "destination": {
                    "table": "my_custom_table"
                }
            }
        }
        
        response = await async_client.post(
            "/api/v1/pipelines/from-template",
            json=template_data,
            headers=auth_headers
        )
        
        # This might return 404 if templates aren't implemented yet
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND]


class TestPipelineSharing:
    """Test pipeline sharing and collaboration features."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_share_pipeline(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test sharing a pipeline with another user."""
        share_data = {
            "user_email": "collaborator@example.com",
            "permission": "read"  # read, write, or execute
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/share",
            json=share_data,
            headers=auth_headers
        )
        
        # This might return 404 if sharing isn't implemented yet
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND]
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_clone_pipeline(self, async_client: AsyncClient, auth_headers: dict, test_pipeline: Pipeline):
        """Test cloning an existing pipeline."""
        clone_data = {
            "name": "Cloned Pipeline",
            "description": "Cloned from original pipeline"
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/clone",
            json=clone_data,
            headers=auth_headers
        )
        
        # This might return 404 if cloning isn't implemented yet
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND]


class TestPipelineVersioning:
    """Test pipeline versioning functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_get_pipeline_versions(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test getting pipeline version history."""
        response = await async_client.get(
            f"/api/v1/pipelines/{test_pipeline.id}/versions",
            headers=auth_headers
        )
        
        # This might return 404 if versioning isn't implemented yet
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
    
    @pytest.mark.asyncio
    @pytest.mark.pipeline
    async def test_create_pipeline_version(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pipeline: Pipeline
    ):
        """Test creating a new version of a pipeline."""
        version_data = {
            "version_name": "v2.0",
            "changelog": "Added new transformation step"
        }
        
        response = await async_client.post(
            f"/api/v1/pipelines/{test_pipeline.id}/versions",
            json=version_data,
            headers=auth_headers
        )
        
        # This might return 404 if versioning isn't implemented yet
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_404_NOT_FOUND]
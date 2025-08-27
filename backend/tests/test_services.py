"""
Service layer tests.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.connector import Connector
from app.models.pipeline import Pipeline
from app.services.connector_service import ConnectorService
from app.services.pipeline_service import PipelineService
from app.services.transformations.data_transformations import DataTransformer


class TestConnectorService:
    """Test connector service functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_create_connector(self, db_session: AsyncSession, test_user: User):
        """Test creating a connector through service."""
        service = ConnectorService(db_session)
        
        connector_data = {
            "name": "Test Service Connector",
            "type": "postgres",
            "config": {
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "username": "test_user",
                "password": "test_password"
            }
        }
        
        connector = await service.create_connector(connector_data, test_user.id)
        
        assert connector.name == connector_data["name"]
        assert connector.type == connector_data["type"]
        assert connector.user_id == test_user.id
        assert connector.is_active is True
        
        # Password should be encrypted
        assert connector.config["password"] != "test_password"
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_connector_by_id(self, db_session: AsyncSession, test_connector: Connector, test_user: User):
        """Test getting connector by ID through service."""
        service = ConnectorService(db_session)
        
        connector = await service.get_connector(test_connector.id, test_user.id)
        
        assert connector is not None
        assert connector.id == test_connector.id
        assert connector.user_id == test_user.id
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_connector_unauthorized(self, db_session: AsyncSession, test_connector: Connector):
        """Test getting connector with wrong user ID."""
        service = ConnectorService(db_session)
        
        connector = await service.get_connector(test_connector.id, 99999)
        
        assert connector is None
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_connector(self, db_session: AsyncSession, test_connector: Connector, test_user: User):
        """Test updating connector through service."""
        service = ConnectorService(db_session)
        
        update_data = {
            "name": "Updated Service Connector",
            "config": {
                "host": "updated-host",
                "port": 5433,
                "database": "updated_db",
                "username": "updated_user",
                "password": "updated_password"
            }
        }
        
        updated_connector = await service.update_connector(test_connector.id, update_data, test_user.id)
        
        assert updated_connector is not None
        assert updated_connector.name == update_data["name"]
        assert updated_connector.config["host"] == "updated-host"
        assert updated_connector.config["port"] == 5433
        
        # Password should be re-encrypted
        assert updated_connector.config["password"] != "updated_password"
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_delete_connector(self, db_session: AsyncSession, test_connector: Connector, test_user: User):
        """Test deleting connector through service."""
        service = ConnectorService(db_session)
        
        result = await service.delete_connector(test_connector.id, test_user.id)
        
        assert result is True
        
        # Verify connector is deleted
        deleted_connector = await service.get_connector(test_connector.id, test_user.id)
        assert deleted_connector is None
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_list_connectors(self, db_session: AsyncSession, test_user: User):
        """Test listing connectors for a user."""
        service = ConnectorService(db_session)
        
        # Create multiple connectors
        connector_data = {
            "name": "List Test Connector {}",
            "type": "postgres",
            "config": {"host": "localhost", "port": 5432, "database": "test", "username": "user"}
        }
        
        for i in range(3):
            data = connector_data.copy()
            data["name"] = data["name"].format(i)
            await service.create_connector(data, test_user.id)
        
        connectors = await service.list_connectors(test_user.id)
        
        assert len(connectors) >= 3
        for connector in connectors:
            assert connector.user_id == test_user.id
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    @patch('app.services.connectors.postgres_connector.PostgresConnector.test_connection')
    async def test_test_connector_connection(
        self,
        mock_test_connection: MagicMock,
        db_session: AsyncSession,
        test_connector: Connector,
        test_user: User
    ):
        """Test testing connector connection through service."""
        mock_test_connection.return_value = {"status": "success", "message": "Connection successful"}
        
        service = ConnectorService(db_session)
        
        result = await service.test_connection(test_connector.id, test_user.id)
        
        assert result["status"] == "success"
        assert "successful" in result["message"]
        mock_test_connection.assert_called_once()


class TestPipelineService:
    """Test pipeline service functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_create_pipeline(self, db_session: AsyncSession, test_user: User):
        """Test creating a pipeline through service."""
        service = PipelineService(db_session)
        
        pipeline_data = {
            "name": "Test Service Pipeline",
            "description": "Pipeline created through service",
            "config": {
                "source": {"type": "csv", "path": "/test/data.csv"},
                "transformations": [{"type": "filter", "column": "status", "value": "active"}],
                "destination": {"type": "postgres", "table": "processed_data"}
            }
        }
        
        pipeline = await service.create_pipeline(pipeline_data, test_user.id)
        
        assert pipeline.name == pipeline_data["name"]
        assert pipeline.description == pipeline_data["description"]
        assert pipeline.user_id == test_user.id
        assert pipeline.status == "draft"
        assert pipeline.is_active is True
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_get_pipeline_by_id(self, db_session: AsyncSession, test_pipeline: Pipeline, test_user: User):
        """Test getting pipeline by ID through service."""
        service = PipelineService(db_session)
        
        pipeline = await service.get_pipeline(test_pipeline.id, test_user.id)
        
        assert pipeline is not None
        assert pipeline.id == test_pipeline.id
        assert pipeline.user_id == test_user.id
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_update_pipeline(self, db_session: AsyncSession, test_pipeline: Pipeline, test_user: User):
        """Test updating pipeline through service."""
        service = PipelineService(db_session)
        
        update_data = {
            "name": "Updated Service Pipeline",
            "description": "Updated through service",
            "config": {
                "source": {"type": "json", "path": "/test/updated_data.json"},
                "transformations": [{"type": "rename", "mapping": {"old": "new"}}],
                "destination": {"type": "mysql", "table": "updated_data"}
            }
        }
        
        updated_pipeline = await service.update_pipeline(test_pipeline.id, update_data, test_user.id)
        
        assert updated_pipeline is not None
        assert updated_pipeline.name == update_data["name"]
        assert updated_pipeline.description == update_data["description"]
        assert updated_pipeline.config["source"]["type"] == "json"
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    @patch('app.workers.pipeline_tasks.execute_pipeline_task.delay')
    async def test_execute_pipeline(
        self,
        mock_celery_task: MagicMock,
        db_session: AsyncSession,
        test_pipeline: Pipeline,
        test_user: User
    ):
        """Test executing pipeline through service."""
        mock_celery_task.return_value = MagicMock(id="service-task-id")
        
        service = PipelineService(db_session)
        
        result = await service.execute_pipeline(test_pipeline.id, test_user.id)
        
        assert result["task_id"] == "service-task-id"
        assert result["message"] == "Pipeline execution started"
        mock_celery_task.assert_called_once_with(test_pipeline.id)
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_pipeline_config(self, db_session: AsyncSession, test_pipeline: Pipeline, test_user: User):
        """Test validating pipeline configuration through service."""
        service = PipelineService(db_session)
        
        result = await service.validate_pipeline(test_pipeline.id, test_user.id)
        
        assert "valid" in result
        assert "errors" in result
        assert "warnings" in result
        assert isinstance(result["valid"], bool)
        assert isinstance(result["errors"], list)
        assert isinstance(result["warnings"], list)


class TestDataTransformer:
    """Test data transformation functionality."""
    
    def test_filter_transformation(self, performance_test_data: pd.DataFrame):
        """Test filter transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "filter",
            "column": "age",
            "operator": "greater_than",
            "value": 30
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        assert len(result) < len(performance_test_data)
        assert all(result["age"] > 30)
    
    def test_rename_transformation(self, performance_test_data: pd.DataFrame):
        """Test rename transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "rename",
            "mapping": {
                "name": "full_name",
                "email": "email_address"
            }
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        assert "full_name" in result.columns
        assert "email_address" in result.columns
        assert "name" not in result.columns
        assert "email" not in result.columns
        assert len(result) == len(performance_test_data)
    
    def test_aggregate_transformation(self, performance_test_data: pd.DataFrame):
        """Test aggregation transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "aggregate",
            "group_by": ["age"],
            "aggregations": {
                "score": ["mean", "count"],
                "id": ["min", "max"]
            }
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        expected_columns = ["age", "score_mean", "score_count", "id_min", "id_max"]
        assert all(col in result.columns for col in expected_columns)
        assert len(result) <= len(performance_test_data)  # Should be grouped
    
    def test_sort_transformation(self, performance_test_data: pd.DataFrame):
        """Test sort transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "sort",
            "columns": ["age", "score"],
            "ascending": [True, False]
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        assert len(result) == len(performance_test_data)
        # Check if sorted correctly (age ascending, score descending within same age)
        for i in range(1, len(result)):
            curr_age = result.iloc[i]["age"]
            prev_age = result.iloc[i-1]["age"]
            assert curr_age >= prev_age
    
    def test_add_column_transformation(self, performance_test_data: pd.DataFrame):
        """Test add column transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "add_column",
            "column_name": "age_category",
            "expression": "lambda row: 'young' if row['age'] < 30 else 'middle' if row['age'] < 60 else 'senior'"
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        assert "age_category" in result.columns
        assert len(result) == len(performance_test_data)
        assert all(cat in ["young", "middle", "senior"] for cat in result["age_category"])
    
    def test_remove_columns_transformation(self, performance_test_data: pd.DataFrame):
        """Test remove columns transformation."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "remove_columns",
            "columns": ["id", "email"]
        }
        
        result = transformer.apply_transformation(performance_test_data, transformation)
        
        assert "id" not in result.columns
        assert "email" not in result.columns
        assert "name" in result.columns  # Should still be there
        assert "age" in result.columns   # Should still be there
        assert len(result) == len(performance_test_data)
    
    def test_chain_transformations(self, performance_test_data: pd.DataFrame):
        """Test chaining multiple transformations."""
        transformer = DataTransformer()
        
        transformations = [
            {
                "type": "filter",
                "column": "age",
                "operator": "greater_than",
                "value": 25
            },
            {
                "type": "rename",
                "mapping": {"name": "full_name"}
            },
            {
                "type": "add_column",
                "column_name": "age_group",
                "expression": "lambda row: 'adult' if row['age'] >= 18 else 'minor'"
            }
        ]
        
        result = performance_test_data.copy()
        for transformation in transformations:
            result = transformer.apply_transformation(result, transformation)
        
        assert len(result) < len(performance_test_data)  # Filter applied
        assert "full_name" in result.columns  # Rename applied
        assert "age_group" in result.columns  # Add column applied
        assert all(result["age"] > 25)  # Filter condition
        assert all(result["age_group"] == "adult")  # All should be adults (age > 25)
    
    def test_invalid_transformation_type(self, performance_test_data: pd.DataFrame):
        """Test handling of invalid transformation type."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "invalid_type",
            "column": "age"
        }
        
        with pytest.raises(ValueError, match="Unknown transformation type"):
            transformer.apply_transformation(performance_test_data, transformation)
    
    def test_transformation_with_missing_column(self, performance_test_data: pd.DataFrame):
        """Test transformation with non-existent column."""
        transformer = DataTransformer()
        
        transformation = {
            "type": "filter",
            "column": "nonexistent_column",
            "operator": "equals",
            "value": "test"
        }
        
        with pytest.raises(KeyError):
            transformer.apply_transformation(performance_test_data, transformation)


class TestVisualizationService:
    """Test visualization service functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    @patch('app.services.visualization_service.plt')
    async def test_generate_chart(self, mock_plt: MagicMock, performance_test_data: pd.DataFrame):
        """Test chart generation."""
        from app.services.visualization_service import VisualizationService
        
        service = VisualizationService()
        
        chart_config = {
            "type": "bar",
            "x_column": "age",
            "y_column": "score",
            "title": "Age vs Score",
            "x_label": "Age",
            "y_label": "Score"
        }
        
        result = await service.generate_chart(performance_test_data, chart_config)
        
        assert "chart_url" in result
        assert result["chart_type"] == "bar"
        mock_plt.figure.assert_called_once()
        mock_plt.savefig.assert_called_once()
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_generate_summary_statistics(self, performance_test_data: pd.DataFrame):
        """Test summary statistics generation."""
        from app.services.visualization_service import VisualizationService
        
        service = VisualizationService()
        
        result = await service.generate_summary_stats(performance_test_data)
        
        assert "total_rows" in result
        assert "column_stats" in result
        assert result["total_rows"] == len(performance_test_data)
        
        # Check numeric column stats
        assert "age" in result["column_stats"]
        assert "score" in result["column_stats"]
        
        age_stats = result["column_stats"]["age"]
        assert "mean" in age_stats
        assert "median" in age_stats
        assert "std" in age_stats
        assert "min" in age_stats
        assert "max" in age_stats


class TestFileHandler:
    """Test file handling service."""
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_validate_file_type(self, sample_csv_file: str):
        """Test file type validation."""
        from app.services.file_handler import FileHandler
        
        handler = FileHandler()
        
        result = await handler.validate_file(sample_csv_file)
        
        assert result["valid"] is True
        assert result["file_type"] == "csv"
        assert result["size"] > 0
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_read_csv_file(self, sample_csv_file: str):
        """Test reading CSV file."""
        from app.services.file_handler import FileHandler
        
        handler = FileHandler()
        
        result = await handler.read_file(sample_csv_file)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2  # Sample CSV has 2 data rows
        assert "name" in result.columns
        assert "email" in result.columns
        assert "age" in result.columns
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_read_json_file(self, sample_json_file: str):
        """Test reading JSON file."""
        from app.services.file_handler import FileHandler
        
        handler = FileHandler()
        
        result = await handler.read_file(sample_json_file)
        
        assert isinstance(result, pd.DataFrame)
        assert len(result) == 2  # Sample JSON has 2 records
        assert "name" in result.columns
        assert "email" in result.columns
        assert "age" in result.columns
    
    @pytest.mark.asyncio
    @pytest.mark.unit
    async def test_invalid_file_type(self):
        """Test handling of invalid file type."""
        from app.services.file_handler import FileHandler
        
        handler = FileHandler()
        
        with pytest.raises(ValueError, match="Unsupported file type"):
            await handler.read_file("test.xyz")
    
    @pytest.mark.asyncio
    @pytest.mark.unit  
    async def test_file_size_limit(self, test_settings):
        """Test file size limit validation."""
        from app.services.file_handler import FileHandler
        import tempfile
        import os
        
        handler = FileHandler()
        
        # Create a file larger than the limit
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as f:
            # Write data larger than test limit (10MB)
            large_data = "x" * (test_settings.MAX_UPLOAD_SIZE + 1)
            f.write(large_data.encode())
            f.flush()
            
            result = await handler.validate_file(f.name)
            
            assert result["valid"] is False
            assert "size" in result["error"]
            
            os.unlink(f.name)
"""
Connector system tests.
"""
import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import MagicMock, patch

from app.models.connector import DataConnector
from app.models.user import User


class TestConnectorCRUD:
    """Test connector CRUD operations."""
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating a new connector."""
        connector_data = {
            "name": "Test PostgreSQL Connector",
            "type": "postgres",
            "config": {
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "username": "test_user",
                "password": "test_password"
            }
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == connector_data["name"]
        assert data["type"] == connector_data["type"]
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_list_connectors(self, async_client: AsyncClient, auth_headers: dict, test_connector: Connector):
        """Test listing user's connectors."""
        response = await async_client.get("/api/v1/connectors/", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check if test connector is in the list
        connector_ids = [conn["id"] for conn in data]
        assert test_connector.id in connector_ids
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_get_connector_by_id(self, async_client: AsyncClient, auth_headers: dict, test_connector: Connector):
        """Test getting a specific connector."""
        response = await async_client.get(f"/api/v1/connectors/{test_connector.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_connector.id
        assert data["name"] == test_connector.name
        assert data["type"] == test_connector.type
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_update_connector(self, async_client: AsyncClient, auth_headers: dict, test_connector: Connector):
        """Test updating a connector."""
        update_data = {
            "name": "Updated PostgreSQL Connector",
            "config": {
                "host": "updated-host",
                "port": 5433,
                "database": "updated_db",
                "username": "updated_user"
            }
        }
        
        response = await async_client.put(
            f"/api/v1/connectors/{test_connector.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["config"]["host"] == update_data["config"]["host"]
        assert data["config"]["port"] == update_data["config"]["port"]
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_delete_connector(self, async_client: AsyncClient, auth_headers: dict, test_connector: Connector):
        """Test deleting a connector."""
        response = await async_client.delete(f"/api/v1/connectors/{test_connector.id}", headers=auth_headers)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify connector is deleted
        get_response = await async_client.get(f"/api/v1/connectors/{test_connector.id}", headers=auth_headers)
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_get_nonexistent_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting a non-existent connector."""
        response = await async_client.get("/api/v1/connectors/99999", headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestConnectorValidation:
    """Test connector validation and security."""
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_connector_invalid_type(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating connector with invalid type."""
        connector_data = {
            "name": "Invalid Connector",
            "type": "invalid_type",
            "config": {"host": "localhost"}
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_connector_missing_config(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating connector with missing required config."""
        connector_data = {
            "name": "Incomplete Connector",
            "type": "postgres",
            "config": {"host": "localhost"}  # Missing required fields
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_access_other_user_connector(self, async_client: AsyncClient, test_connector: Connector, db_session: AsyncSession):
        """Test accessing another user's connector."""
        # Create another user
        from app.core.security import get_password_hash, create_access_token
        
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db_session.add(other_user)
        await db_session.commit()
        
        # Create token for other user
        other_token = create_access_token(subject=other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}
        
        # Try to access original user's connector
        response = await async_client.get(
            f"/api/v1/connectors/{test_connector.id}",
            headers=other_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestConnectorTesting:
    """Test connector connection testing functionality."""
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    @patch('app.services.connectors.postgres_connector.PostgresConnector.test_connection')
    async def test_test_postgres_connection_success(
        self,
        mock_test_connection: MagicMock,
        async_client: AsyncClient,
        auth_headers: dict,
        test_connector: Connector
    ):
        """Test successful PostgreSQL connection test."""
        mock_test_connection.return_value = {"status": "success", "message": "Connection successful"}
        
        response = await async_client.post(
            f"/api/v1/connectors/{test_connector.id}/test",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "message" in data
        mock_test_connection.assert_called_once()
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    @patch('app.services.connectors.postgres_connector.PostgresConnector.test_connection')
    async def test_test_postgres_connection_failure(
        self,
        mock_test_connection: MagicMock,
        async_client: AsyncClient,
        auth_headers: dict,
        test_connector: Connector
    ):
        """Test failed PostgreSQL connection test."""
        mock_test_connection.return_value = {
            "status": "error",
            "message": "Connection failed: Could not connect to server"
        }
        
        response = await async_client.post(
            f"/api/v1/connectors/{test_connector.id}/test",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "error"
        assert "Connection failed" in data["message"]
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_test_nonexistent_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test testing connection for non-existent connector."""
        response = await async_client.post("/api/v1/connectors/99999/test", headers=auth_headers)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestConnectorTypes:
    """Test different connector types and their specific requirements."""
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_mysql_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating MySQL connector."""
        connector_data = {
            "name": "Test MySQL Connector",
            "type": "mysql",
            "config": {
                "host": "localhost",
                "port": 3306,
                "database": "test_db",
                "username": "test_user",
                "password": "test_password"
            }
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["type"] == "mysql"
        assert data["config"]["port"] == 3306
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_csv_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating CSV file connector."""
        connector_data = {
            "name": "Test CSV Connector",
            "type": "csv",
            "config": {
                "file_path": "/path/to/data.csv",
                "delimiter": ",",
                "has_header": True
            }
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["type"] == "csv"
        assert data["config"]["delimiter"] == ","
        assert data["config"]["has_header"] is True
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_create_json_connector(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating JSON file connector."""
        connector_data = {
            "name": "Test JSON Connector",
            "type": "json",
            "config": {
                "file_path": "/path/to/data.json",
                "json_path": "$.data"
            }
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["type"] == "json"
        assert data["config"]["json_path"] == "$.data"


class TestConnectorSecurity:
    """Test connector security features."""
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_password_encryption_in_storage(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test that passwords are encrypted when stored."""
        connector_data = {
            "name": "Security Test Connector",
            "type": "postgres",
            "config": {
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "username": "test_user",
                "password": "secret_password_123"
            }
        }
        
        response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        connector_id = response.json()["id"]
        
        # Fetch connector directly from database
        result = await db_session.execute(
            "SELECT config FROM connectors WHERE id = :id",
            {"id": connector_id}
        )
        stored_config = result.fetchone()[0]
        
        # Password should be encrypted, not plain text
        assert stored_config["password"] != "secret_password_123"
        assert len(stored_config["password"]) > len("secret_password_123")
    
    @pytest.mark.asyncio
    @pytest.mark.connector
    async def test_sensitive_data_not_in_response(self, async_client: AsyncClient, auth_headers: dict):
        """Test that sensitive data is not returned in API responses."""
        connector_data = {
            "name": "Sensitive Data Test",
            "type": "postgres",
            "config": {
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "username": "test_user",
                "password": "secret_password_123"
            }
        }
        
        create_response = await async_client.post(
            "/api/v1/connectors/",
            json=connector_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == status.HTTP_201_CREATED
        create_data = create_response.json()
        
        # Check that password is masked in create response
        assert create_data["config"]["password"] == "***"
        
        # Check that password is masked in get response
        get_response = await async_client.get(
            f"/api/v1/connectors/{create_data['id']}",
            headers=auth_headers
        )
        
        assert get_response.status_code == status.HTTP_200_OK
        get_data = get_response.json()
        assert get_data["config"]["password"] == "***"
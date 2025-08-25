"""
Test suite for Connector CRUD API endpoints.
Tests real connector management operations with database interactions.
"""

import asyncio
import logging
from uuid import UUID
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_session, engine
from app.models.connector import DataConnector, ConnectorType, ConnectorStatus
from app.schemas.connector import ConnectorCreate, ConnectorUpdate

# Configure logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)


class TestConnectorCRUD:
    """Test suite for connector CRUD operations."""

    def test_create_database_connector_postgresql(self):
        """Test creating a PostgreSQL database connector."""
        logger.info("🧪 Testing PostgreSQL Connector Creation")
        
        connector_data = {
            "name": "Test PostgreSQL Connector",
            "description": "A test PostgreSQL connector for development",
            "type": "database",
            "connection_config": {
                "type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "test_db",
                "username": "test_user",
                "password": "test_password",
                "ssl_mode": "prefer"
            }
        }
        
        response = client.post("/api/v1/connectors/", json=connector_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == connector_data["name"]
        assert data["description"] == connector_data["description"]
        assert data["type"] == connector_data["type"]
        assert data["status"] == "inactive"
        assert data["connection_config"] == connector_data["connection_config"]
        assert "id" in data
        assert "created_at" in data
        
        logger.info(f"✅ Created PostgreSQL connector with ID: {data['id']}")
        return data["id"]

    def test_create_database_connector_mysql(self):
        """Test creating a MySQL database connector."""
        logger.info("🧪 Testing MySQL Connector Creation")
        
        connector_data = {
            "name": "Test MySQL Connector",
            "description": "A test MySQL connector for development",
            "type": "database",
            "connection_config": {
                "type": "mysql",
                "host": "localhost",
                "port": 3306,
                "database": "dreflowpro_mysql",
                "username": "root",
                "password": "",
                "ssl_mode": "disabled"
            }
        }
        
        response = client.post("/api/v1/connectors/", json=connector_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == connector_data["name"]
        assert data["type"] == connector_data["type"]
        
        logger.info(f"✅ Created MySQL connector with ID: {data['id']}")
        return data["id"]

    def test_list_connectors_empty(self):
        """Test listing connectors when none exist."""
        logger.info("🧪 Testing List Connectors (Empty)")
        
        response = client.get("/api/v1/connectors/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == 0
        assert data["connectors"] == []
        assert data["page"] == 1
        assert data["size"] == 0
        
        logger.info("✅ Empty connector list returned correctly")

    def test_full_connector_lifecycle(self):
        """Test the complete connector lifecycle: create, read, update, delete."""
        logger.info("🧪 Testing Full Connector Lifecycle")
        
        # 1. Create a connector
        connector_data = {
            "name": "Lifecycle Test Connector",
            "description": "Testing full lifecycle",
            "type": "database",
            "connection_config": {
                "type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "lifecycle_test",
                "username": "test_user",
                "password": "secret"
            }
        }
        
        create_response = client.post("/api/v1/connectors/", json=connector_data)
        assert create_response.status_code == 201
        created_connector = create_response.json()
        connector_id = created_connector["id"]
        
        logger.info(f"✅ Created connector: {connector_id}")
        
        # 2. Read the connector
        get_response = client.get(f"/api/v1/connectors/{connector_id}")
        assert get_response.status_code == 200
        fetched_connector = get_response.json()
        
        assert fetched_connector["id"] == connector_id
        assert fetched_connector["name"] == connector_data["name"]
        assert fetched_connector["description"] == connector_data["description"]
        
        logger.info(f"✅ Retrieved connector: {connector_id}")
        
        # 3. List connectors (should include our new one)
        list_response = client.get("/api/v1/connectors/")
        assert list_response.status_code == 200
        connectors_list = list_response.json()
        
        assert connectors_list["total"] >= 1
        connector_ids = [c["id"] for c in connectors_list["connectors"]]
        assert connector_id in connector_ids
        
        logger.info(f"✅ Found connector in list: {connector_id}")
        
        # 4. Update the connector
        update_data = {
            "name": "Updated Lifecycle Connector",
            "description": "Updated description",
            "status": "active"
        }
        
        update_response = client.put(f"/api/v1/connectors/{connector_id}", json=update_data)
        assert update_response.status_code == 200
        updated_connector = update_response.json()
        
        assert updated_connector["name"] == update_data["name"]
        assert updated_connector["description"] == update_data["description"]
        assert updated_connector["status"] == update_data["status"]
        
        logger.info(f"✅ Updated connector: {connector_id}")
        
        # 5. Delete the connector
        delete_response = client.delete(f"/api/v1/connectors/{connector_id}")
        assert delete_response.status_code == 204
        
        logger.info(f"✅ Deleted connector: {connector_id}")
        
        # 6. Verify deletion (should return 404)
        get_deleted_response = client.get(f"/api/v1/connectors/{connector_id}")
        assert get_deleted_response.status_code == 404
        
        logger.info(f"✅ Confirmed deletion: {connector_id}")

    def test_connector_filtering(self):
        """Test filtering connectors by type and status."""
        logger.info("🧪 Testing Connector Filtering")
        
        # Create multiple connectors with different types and statuses
        connectors_to_create = [
            {
                "name": "Database Connector 1",
                "type": "database",
                "connection_config": {"type": "postgresql", "host": "localhost"}
            },
            {
                "name": "CSV Connector 1",
                "type": "csv",
                "connection_config": {"file_path": "/test/data.csv"}
            },
            {
                "name": "API Connector 1", 
                "type": "api",
                "connection_config": {"base_url": "https://api.example.com"}
            }
        ]
        
        created_ids = []
        for connector_data in connectors_to_create:
            response = client.post("/api/v1/connectors/", json=connector_data)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])
        
        logger.info(f"✅ Created {len(created_ids)} test connectors")
        
        # Test filtering by type
        db_filter_response = client.get("/api/v1/connectors/?type=database")
        assert db_filter_response.status_code == 200
        db_connectors = db_filter_response.json()
        
        # Should have at least our database connector
        assert db_connectors["total"] >= 1
        for connector in db_connectors["connectors"]:
            assert connector["type"] == "database"
        
        logger.info(f"✅ Database filter returned {db_connectors['total']} connectors")
        
        # Test filtering by status
        inactive_filter_response = client.get("/api/v1/connectors/?status=inactive")
        assert inactive_filter_response.status_code == 200
        inactive_connectors = inactive_filter_response.json()
        
        # All new connectors should be inactive by default
        assert inactive_connectors["total"] >= len(created_ids)
        for connector in inactive_connectors["connectors"]:
            assert connector["status"] == "inactive"
        
        logger.info(f"✅ Status filter returned {inactive_connectors['total']} connectors")
        
        # Cleanup
        for connector_id in created_ids:
            delete_response = client.delete(f"/api/v1/connectors/{connector_id}")
            assert delete_response.status_code == 204
        
        logger.info(f"✅ Cleaned up {len(created_ids)} test connectors")

    def test_connector_pagination(self):
        """Test pagination of connector listings."""
        logger.info("🧪 Testing Connector Pagination")
        
        # Create multiple connectors for pagination testing
        connector_ids = []
        for i in range(7):  # Create 7 connectors
            connector_data = {
                "name": f"Pagination Test Connector {i+1}",
                "type": "csv",
                "connection_config": {"file_path": f"/test/data_{i+1}.csv"}
            }
            
            response = client.post("/api/v1/connectors/", json=connector_data)
            assert response.status_code == 201
            connector_ids.append(response.json()["id"])
        
        logger.info(f"✅ Created {len(connector_ids)} connectors for pagination")
        
        # Test first page (limit 3)
        page1_response = client.get("/api/v1/connectors/?skip=0&limit=3")
        assert page1_response.status_code == 200
        page1_data = page1_response.json()
        
        assert page1_data["size"] == 3
        assert page1_data["page"] == 1
        assert page1_data["total"] >= 7
        
        logger.info(f"✅ Page 1: {page1_data['size']} connectors")
        
        # Test second page
        page2_response = client.get("/api/v1/connectors/?skip=3&limit=3")
        assert page2_response.status_code == 200
        page2_data = page2_response.json()
        
        assert page2_data["size"] == 3
        assert page2_data["page"] == 2
        
        logger.info(f"✅ Page 2: {page2_data['size']} connectors")
        
        # Test third page (should have remaining connectors)
        page3_response = client.get("/api/v1/connectors/?skip=6&limit=3")
        assert page3_response.status_code == 200
        page3_data = page3_response.json()
        
        assert page3_data["size"] >= 1
        assert page3_data["page"] == 3
        
        logger.info(f"✅ Page 3: {page3_data['size']} connectors")
        
        # Cleanup
        for connector_id in connector_ids:
            delete_response = client.delete(f"/api/v1/connectors/{connector_id}")
            assert delete_response.status_code == 204
        
        logger.info(f"✅ Cleaned up {len(connector_ids)} pagination test connectors")

    def test_test_connector_connection(self):
        """Test the connector connection testing endpoint."""
        logger.info("🧪 Testing Connector Connection Testing")
        
        # Test PostgreSQL connection (should fail since we don't have real creds)
        test_config = {
            "connection_config": {
                "type": "postgresql",
                "host": "localhost",
                "port": 5432,
                "database": "nonexistent_db",
                "username": "fake_user",
                "password": "fake_password"
            }
        }
        
        response = client.post("/api/v1/connectors/test?connector_type=database", json=test_config)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "message" in data
        
        # Connection should fail with fake credentials
        assert data["success"] == False
        assert "Connection failed" in data["message"]
        
        logger.info(f"✅ Connection test returned expected failure: {data['message']}")

    def test_error_handling(self):
        """Test various error conditions."""
        logger.info("🧪 Testing Error Handling")
        
        # Test getting non-existent connector
        fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
        get_response = client.get(f"/api/v1/connectors/{fake_uuid}")
        assert get_response.status_code == 404
        
        logger.info("✅ Non-existent connector returns 404")
        
        # Test updating non-existent connector
        update_data = {"name": "Updated Name"}
        update_response = client.put(f"/api/v1/connectors/{fake_uuid}", json=update_data)
        assert update_response.status_code == 404
        
        logger.info("✅ Update non-existent connector returns 404")
        
        # Test deleting non-existent connector
        delete_response = client.delete(f"/api/v1/connectors/{fake_uuid}")
        assert delete_response.status_code == 404
        
        logger.info("✅ Delete non-existent connector returns 404")
        
        # Test invalid connector data
        invalid_data = {
            "name": "",  # Empty name should fail validation
            "type": "invalid_type"
        }
        create_response = client.post("/api/v1/connectors/", json=invalid_data)
        assert create_response.status_code == 422  # Validation error
        
        logger.info("✅ Invalid connector data returns 422")

    def run_all_tests(self):
        """Run all connector CRUD tests."""
        logger.info("🚀 STARTING CONNECTOR CRUD TESTING")
        logger.info("=" * 60)
        
        try:
            # Test basic operations
            self.test_list_connectors_empty()
            logger.info("\n" + "=" * 60)
            
            self.test_create_database_connector_postgresql()
            logger.info("\n" + "=" * 60)
            
            self.test_create_database_connector_mysql()
            logger.info("\n" + "=" * 60)
            
            # Test full lifecycle
            self.test_full_connector_lifecycle()
            logger.info("\n" + "=" * 60)
            
            # Test advanced features
            self.test_connector_filtering()
            logger.info("\n" + "=" * 60)
            
            self.test_connector_pagination()
            logger.info("\n" + "=" * 60)
            
            # Test connection testing
            self.test_test_connector_connection()
            logger.info("\n" + "=" * 60)
            
            # Test error handling
            self.test_error_handling()
            logger.info("\n" + "=" * 60)
            
            logger.info("🎉 ALL CONNECTOR CRUD TESTS PASSED!")
            
        except Exception as e:
            logger.error(f"❌ CONNECTOR CRUD TEST FAILED: {str(e)}")
            raise


# Run tests directly
if __name__ == "__main__":
    test_suite = TestConnectorCRUD()
    test_suite.run_all_tests()
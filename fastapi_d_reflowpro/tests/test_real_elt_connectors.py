"""
REAL ELT CONNECTOR TESTING
Tests actual database operations with PostgreSQL and MySQL connectors.
"""

import asyncio
import pandas as pd
import logging
from typing import Dict, Any
import os
import uuid
import sys
import traceback

from app.services.connectors import PostgreSQLConnector, MySQLConnector
from app.services.etl_engine.pipeline_executor import PipelineExecutor

# Configure logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
POSTGRES_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "dreflowpro"),
    "username": os.getenv("POSTGRES_USER", "kojo"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
    "min_connections": 1,
    "max_connections": 5
}

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "database": os.getenv("MYSQL_DB", "dreflowpro_mysql"),
    "username": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "min_connections": 1,
    "max_connections": 5
}

class TestRealELTConnectors:
    """Test suite for real ELT database operations."""
    
    async def test_postgresql_connector_real_operations(self):
        """Test PostgreSQL connector with REAL database operations."""
        logger.info("🧪 Testing PostgreSQL Connector - REAL DATABASE OPERATIONS")
        
        connector = PostgreSQLConnector(POSTGRES_CONFIG)
        test_table = f"test_table_{uuid.uuid4().hex[:8]}"
        
        try:
            # Test 1: Real Connection
            logger.info("📡 Testing real PostgreSQL connection...")
            connection_result = await connector.connect()
            assert connection_result == True, "Failed to connect to PostgreSQL"
            logger.info("✅ PostgreSQL connection successful!")
            
            # Test 2: Connection Status
            logger.info("🔍 Testing connection status...")
            status = await connector.test_connection()
            assert status["status"] == "success", f"Connection test failed: {status}"
            logger.info(f"✅ Connection status: {status['server_version']}")
            
            # Test 3: Schema Discovery
            logger.info("🗂️ Testing schema discovery...")
            schema_info = await connector.get_schema_info()
            assert "tables" in schema_info, "Schema info missing tables"
            assert schema_info["table_count"] >= 0, "Invalid table count"
            logger.info(f"✅ Found {schema_info['table_count']} tables in schema")
            
            # Test 4: Real Data Loading
            logger.info("💾 Testing REAL data loading...")
            test_data = pd.DataFrame({
                "id": [1, 2, 3, 4, 5],
                "name": ["Test1", "Test2", "Test3", "Test4", "Test5"],
                "value": [10.5, 20.0, 30.5, 40.0, 50.5],
                "created_at": pd.Timestamp.now()
            })
            
            # Create test table first
            await self._create_postgres_test_table(connector, test_table)
            
            load_config = {"table": test_table}
            load_result = await connector.load_data(test_data, load_config, mode="append")
            
            assert load_result["status"] == "success", f"Data loading failed: {load_result}"
            assert load_result["rows_loaded"] == 5, f"Expected 5 rows, got {load_result['rows_loaded']}"
            logger.info(f"✅ Loaded {load_result['rows_loaded']} rows in {load_result['load_time_seconds']:.2f}s")
            
            # Test 5: Real Data Extraction
            logger.info("📤 Testing REAL data extraction...")
            query_config = {
                "table": test_table,
                "columns": ["id", "name", "value"],
                "order_by": "id"
            }
            
            extracted_rows = []
            async for batch_df in connector.extract_data(query_config, batch_size=3):
                extracted_rows.extend(batch_df.to_dict('records'))
            
            assert len(extracted_rows) == 5, f"Expected 5 extracted rows, got {len(extracted_rows)}"
            assert extracted_rows[0]["name"] == "Test1", "First row data mismatch"
            logger.info(f"✅ Extracted {len(extracted_rows)} rows successfully")
            
            # Test 6: Query Execution
            logger.info("🔍 Testing custom query execution...")
            query_result = await connector.execute_query(f"SELECT COUNT(*) as total FROM {test_table}")
            assert not query_result.empty, "Query result is empty"
            assert query_result.iloc[0]["total"] == 5, "Query count mismatch"
            logger.info(f"✅ Query executed: Found {query_result.iloc[0]['total']} records")
            
        finally:
            # Cleanup
            try:
                await connector.execute_query(f"DROP TABLE IF EXISTS {test_table}")
                logger.info(f"🧹 Cleaned up test table: {test_table}")
            except:
                pass
            await connector.disconnect()
            logger.info("✅ PostgreSQL connector test completed!")
    
    async def test_mysql_connector_real_operations(self):
        """Test MySQL connector with REAL database operations.""" 
        logger.info("🧪 Testing MySQL Connector - REAL DATABASE OPERATIONS")
        
        connector = MySQLConnector(MYSQL_CONFIG)
        test_table = f"test_table_{uuid.uuid4().hex[:8]}"
        
        try:
            # Test 1: Real Connection
            logger.info("📡 Testing real MySQL connection...")
            connection_result = await connector.connect()
            assert connection_result == True, "Failed to connect to MySQL"
            logger.info("✅ MySQL connection successful!")
            
            # Test 2: Connection Status
            logger.info("🔍 Testing connection status...")
            status = await connector.test_connection()
            assert status["status"] == "success", f"Connection test failed: {status}"
            logger.info(f"✅ Connection status: {status['server_version']}")
            
            # Test 3: Schema Discovery
            logger.info("🗂️ Testing schema discovery...")
            schema_info = await connector.get_schema_info()
            assert "tables" in schema_info, "Schema info missing tables"
            assert schema_info["table_count"] >= 0, "Invalid table count"
            logger.info(f"✅ Found {schema_info['table_count']} tables in schema")
            
            # Test 4: Real Data Loading
            logger.info("💾 Testing REAL data loading...")
            test_data = pd.DataFrame({
                "id": [1, 2, 3, 4, 5],
                "name": ["Test1", "Test2", "Test3", "Test4", "Test5"],
                "value": [10.5, 20.0, 30.5, 40.0, 50.5]
            })
            
            # Create test table first
            await self._create_mysql_test_table(connector, test_table)
            
            load_config = {"table": test_table}
            load_result = await connector.load_data(test_data, load_config, mode="append")
            
            assert load_result["status"] == "success", f"Data loading failed: {load_result}"
            assert load_result["rows_loaded"] == 5, f"Expected 5 rows, got {load_result['rows_loaded']}"
            logger.info(f"✅ Loaded {load_result['rows_loaded']} rows in {load_result['load_time_seconds']:.2f}s")
            
            # Test 5: Real Data Extraction
            logger.info("📤 Testing REAL data extraction...")
            query_config = {
                "table": test_table,
                "columns": ["id", "name", "value"],
                "order_by": "id"
            }
            
            extracted_rows = []
            async for batch_df in connector.extract_data(query_config, batch_size=3):
                extracted_rows.extend(batch_df.to_dict('records'))
            
            assert len(extracted_rows) == 5, f"Expected 5 extracted rows, got {len(extracted_rows)}"
            assert extracted_rows[0]["name"] == "Test1", "First row data mismatch"
            logger.info(f"✅ Extracted {len(extracted_rows)} rows successfully")
            
            # Test 6: Query Execution
            logger.info("🔍 Testing custom query execution...")
            query_result = await connector.execute_query(f"SELECT COUNT(*) as total FROM `{test_table}`")
            assert not query_result.empty, "Query result is empty"
            assert query_result.iloc[0]["total"] == 5, "Query count mismatch"
            logger.info(f"✅ Query executed: Found {query_result.iloc[0]['total']} records")
            
        finally:
            # Cleanup
            try:
                await connector.execute_query(f"DROP TABLE IF EXISTS `{test_table}`")
                logger.info(f"🧹 Cleaned up test table: {test_table}")
            except:
                pass
            await connector.disconnect()
            logger.info("✅ MySQL connector test completed!")
    
    async def test_end_to_end_elt_pipeline(self):
        """Test complete ELT pipeline with REAL database operations."""
        logger.info("🧪 Testing END-TO-END ELT PIPELINE - REAL DATABASE OPERATIONS")
        
        # Setup
        source_table = f"source_table_{uuid.uuid4().hex[:8]}"
        dest_table = f"dest_table_{uuid.uuid4().hex[:8]}"
        
        pg_connector = PostgreSQLConnector(POSTGRES_CONFIG)
        
        try:
            await pg_connector.connect()
            
            # Step 1: Create source table with real data
            logger.info("📝 Setting up source table with real data...")
            await self._create_postgres_test_table(pg_connector, source_table)
            
            source_data = pd.DataFrame({
                "id": list(range(1, 101)),  # 100 records
                "customer_name": [f"Customer_{i}" for i in range(1, 101)],
                "order_amount": [i * 25.50 for i in range(1, 101)],
                "order_date": pd.Timestamp.now()
            })
            
            load_result = await pg_connector.load_data(
                source_data, 
                {"table": source_table}, 
                mode="append"
            )
            assert load_result["rows_loaded"] == 100, "Source data setup failed"
            logger.info(f"✅ Source table created with {load_result['rows_loaded']} records")
            
            # Step 2: Create destination table
            logger.info("📝 Setting up destination table...")
            await self._create_postgres_test_table(pg_connector, dest_table)
            logger.info("✅ Destination table created")
            
            # Step 3: Test PipelineExecutor with REAL database operations
            logger.info("🚀 Testing PipelineExecutor with REAL data...")
            
            # Mock pipeline execution context (simplified for testing)
            executor = PipelineExecutor(
                pipeline_id=1,
                execution_id=1,
                task_id="test_task",
                test_mode=True,
                sample_size=50  # Test with 50 records
            )
            
            # Test data extraction
            source_config = {
                "type": "postgresql",
                "name": "test_source",
                "connection_config": POSTGRES_CONFIG,
                "query_config": {
                    "table": source_table,
                    "columns": ["id", "customer_name", "order_amount"],
                    "where": "id <= 50",  # Test filtering
                    "order_by": "id"
                }
            }
            
            extracted_data = await executor._extract_from_source(source_config)
            assert len(extracted_data) == 50, f"Expected 50 records, got {len(extracted_data)}"
            assert extracted_data[0]["customer_name"] == "Customer_1", "Extraction data mismatch"
            logger.info(f"✅ PipelineExecutor extracted {len(extracted_data)} records")
            
            # Test data loading
            dest_config = {
                "type": "postgresql", 
                "name": "test_destination",
                "connection_config": POSTGRES_CONFIG,
                "load_config": {
                    "table": dest_table,
                    "mode": "append"
                }
            }
            
            load_result = await executor._load_to_destination(dest_config, extracted_data)
            assert load_result["status"] == "success", f"Loading failed: {load_result}"
            assert load_result["records_loaded"] == 50, f"Expected 50 loaded, got {load_result['records_loaded']}"
            logger.info(f"✅ PipelineExecutor loaded {load_result['records_loaded']} records")
            
            # Step 4: Verify end-to-end data integrity
            logger.info("🔍 Verifying end-to-end data integrity...")
            
            verification_query = f"""
                SELECT COUNT(*) as total, 
                       AVG(order_amount) as avg_amount,
                       MIN(id) as min_id,
                       MAX(id) as max_id
                FROM {dest_table}
            """
            
            verification_result = await pg_connector.execute_query(verification_query)
            
            assert verification_result.iloc[0]["total"] == 50, "Record count mismatch in destination"
            assert verification_result.iloc[0]["min_id"] == 1, "Min ID mismatch"
            assert verification_result.iloc[0]["max_id"] == 50, "Max ID mismatch"
            
            logger.info(f"✅ Data integrity verified: {verification_result.iloc[0]['total']} records")
            logger.info(f"✅ Average amount: ${verification_result.iloc[0]['avg_amount']:.2f}")
            
        finally:
            # Cleanup
            try:
                await pg_connector.execute_query(f"DROP TABLE IF EXISTS {source_table}")
                await pg_connector.execute_query(f"DROP TABLE IF EXISTS {dest_table}")
                logger.info("🧹 Cleaned up test tables")
            except:
                pass
            await pg_connector.disconnect()
            logger.info("✅ END-TO-END ELT PIPELINE TEST COMPLETED!")
    
    async def _create_postgres_test_table(self, connector: PostgreSQLConnector, table_name: str):
        """Helper to create PostgreSQL test table."""
        create_sql = f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255),
                name VARCHAR(255),
                order_amount DECIMAL(10,2),
                value DECIMAL(10,2),
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        await connector.execute_query(create_sql)
    
    async def _create_mysql_test_table(self, connector: MySQLConnector, table_name: str):
        """Helper to create MySQL test table."""
        create_sql = f"""
            CREATE TABLE IF NOT EXISTS `{table_name}` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255),
                name VARCHAR(255),
                order_amount DECIMAL(10,2),
                value DECIMAL(10,2),
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        await connector.execute_query(create_sql)

# Run tests directly
if __name__ == "__main__":
    async def run_tests():
        test_suite = TestRealELTConnectors()
        
        print("🚀 STARTING REAL ELT CONNECTOR TESTING")
        print("=" * 60)
        
        try:
            await test_suite.test_postgresql_connector_real_operations()
            print("\n" + "=" * 60)
            
            await test_suite.test_mysql_connector_real_operations()
            print("\n" + "=" * 60)
            
            await test_suite.test_end_to_end_elt_pipeline()
            print("\n" + "=" * 60)
            
            print("🎉 ALL REAL ELT TESTS PASSED!")
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            raise
    
    asyncio.run(run_tests())
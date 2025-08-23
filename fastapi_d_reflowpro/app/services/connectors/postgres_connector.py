"""PostgreSQL connector for ETL/ELT operations."""

import asyncpg
import pandas as pd
import logging
from typing import Dict, Any, List, AsyncGenerator, Optional
import asyncio
from datetime import datetime
import json

from .base_connector import BaseConnector

logger = logging.getLogger(__name__)


class PostgreSQLConnector(BaseConnector):
    """PostgreSQL database connector using asyncpg."""
    
    def __init__(self, connection_config: Dict[str, Any]):
        super().__init__(connection_config)
        self._connection_pool = None
    
    async def connect(self) -> bool:
        """Establish connection pool to PostgreSQL."""
        try:
            # Extract connection parameters
            config = self.connection_config
            connection_string = (
                f"postgresql://{config['username']}:{config['password']}"
                f"@{config['host']}:{config.get('port', 5432)}"
                f"/{config['database']}"
            )
            
            # Create connection pool
            self._connection_pool = await asyncpg.create_pool(
                connection_string,
                min_size=config.get('min_connections', 1),
                max_size=config.get('max_connections', 10),
                command_timeout=config.get('timeout', 30),
                server_settings=config.get('server_settings', {})
            )
            
            self.is_connected = True
            logger.info(f"PostgreSQL connection pool established: {config['host']}:{config.get('port', 5432)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {str(e)}")
            self.is_connected = False
            return False
    
    async def disconnect(self) -> None:
        """Close connection pool."""
        try:
            if self._connection_pool:
                await self._connection_pool.close()
                self._connection_pool = None
            self.is_connected = False
            logger.info("PostgreSQL connection pool closed")
        except Exception as e:
            logger.error(f"Error closing PostgreSQL connection: {str(e)}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and return status."""
        try:
            start_time = datetime.now()
            
            if not self.is_connected:
                await self.connect()
            
            async with self._connection_pool.acquire() as conn:
                # Test query
                result = await conn.fetchval('SELECT version()')
                response_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "status": "success",
                    "message": "Connection successful",
                    "server_version": result,
                    "response_time_seconds": response_time,
                    "connection_pool_size": len(self._connection_pool._holders) + len(self._connection_pool._queue._queue)
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection failed: {str(e)}",
                "error": str(e)
            }
    
    async def get_schema_info(self, table_name: Optional[str] = None) -> Dict[str, Any]:
        """Get schema information for tables."""
        try:
            async with self._connection_pool.acquire() as conn:
                if table_name:
                    # Get specific table info
                    table_info_query = """
                        SELECT 
                            column_name,
                            data_type,
                            is_nullable,
                            column_default,
                            character_maximum_length,
                            numeric_precision,
                            numeric_scale
                        FROM information_schema.columns 
                        WHERE table_name = $1
                        ORDER BY ordinal_position
                    """
                    columns = await conn.fetch(table_info_query, table_name)
                    
                    # Get row count
                    count_query = f'SELECT COUNT(*) FROM "{table_name}"'
                    row_count = await conn.fetchval(count_query)
                    
                    return {
                        "table_name": table_name,
                        "row_count": row_count,
                        "columns": [
                            {
                                "name": col["column_name"],
                                "type": col["data_type"],
                                "nullable": col["is_nullable"] == "YES",
                                "default": col["column_default"],
                                "max_length": col["character_maximum_length"],
                                "precision": col["numeric_precision"],
                                "scale": col["numeric_scale"]
                            }
                            for col in columns
                        ]
                    }
                else:
                    # Get all tables info
                    tables_query = """
                        SELECT 
                            table_name,
                            table_type
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                        ORDER BY table_name
                    """
                    tables = await conn.fetch(tables_query)
                    
                    return {
                        "database": self.connection_config["database"],
                        "schema": "public",
                        "tables": [
                            {
                                "name": table["table_name"],
                                "type": table["table_type"]
                            }
                            for table in tables
                        ],
                        "table_count": len(tables)
                    }
                    
        except Exception as e:
            logger.error(f"Error getting schema info: {str(e)}")
            raise
    
    async def extract_data(
        self,
        query_config: Dict[str, Any],
        batch_size: int = 1000,
        limit: Optional[int] = None
    ) -> AsyncGenerator[pd.DataFrame, None]:
        """Extract data in batches using efficient streaming."""
        
        try:
            # Build query
            if "query" in query_config:
                query = query_config["query"]
            else:
                # Build query from config
                table = query_config.get("table")
                columns = query_config.get("columns", ["*"])
                where_clause = query_config.get("where", "")
                order_by = query_config.get("order_by", "")
                
                column_str = ", ".join(columns) if isinstance(columns, list) else columns
                query = f'SELECT {column_str} FROM "{table}"'
                
                if where_clause:
                    query += f" WHERE {where_clause}"
                if order_by:
                    query += f" ORDER BY {order_by}"
            
            # Add limit if specified
            if limit:
                query += f" LIMIT {limit}"
            
            logger.info(f"Executing PostgreSQL extraction query: {query[:100]}...")
            
            async with self._connection_pool.acquire() as conn:
                # Use server-side cursor for memory efficiency
                async with conn.transaction():
                    rows_processed = 0
                    
                    async for record in conn.cursor(query):
                        batch_records = []
                        batch_records.append(dict(record))
                        
                        # Collect batch
                        for _ in range(batch_size - 1):
                            try:
                                next_record = await record.__anext__()
                                batch_records.append(dict(next_record))
                            except StopAsyncIteration:
                                break
                        
                        # Convert to DataFrame
                        if batch_records:
                            df = pd.DataFrame(batch_records)
                            rows_processed += len(df)
                            
                            logger.info(f"Extracted batch: {len(df)} rows (total: {rows_processed})")
                            yield df
                        
                        if limit and rows_processed >= limit:
                            break
                            
        except Exception as e:
            logger.error(f"Error extracting data from PostgreSQL: {str(e)}")
            raise
    
    async def load_data(
        self,
        data: pd.DataFrame,
        destination_config: Dict[str, Any],
        mode: str = "append"
    ) -> Dict[str, Any]:
        """Load data to PostgreSQL table using efficient bulk operations."""
        
        try:
            table_name = destination_config["table"]
            schema = destination_config.get("schema", "public")
            full_table_name = f'"{schema}"."{table_name}"'
            
            start_time = datetime.now()
            
            async with self._connection_pool.acquire() as conn:
                async with conn.transaction():
                    if mode == "replace":
                        # Truncate table
                        await conn.execute(f"TRUNCATE TABLE {full_table_name}")
                    
                    # Prepare data for COPY
                    columns = list(data.columns)
                    column_str = ", ".join([f'"{col}"' for col in columns])
                    
                    # Convert DataFrame to records
                    records = []
                    for _, row in data.iterrows():
                        # Handle None/NaN values
                        record = []
                        for col in columns:
                            value = row[col]
                            if pd.isna(value):
                                record.append(None)
                            elif isinstance(value, (dict, list)):
                                record.append(json.dumps(value))
                            else:
                                record.append(value)
                        records.append(tuple(record))
                    
                    # Use COPY for bulk insert (most efficient)
                    copy_query = f"COPY {full_table_name} ({column_str}) FROM STDIN"
                    await conn.copy_records_to_table(
                        table_name, 
                        records=records,
                        columns=columns,
                        schema_name=schema
                    )
                    
                    rows_loaded = len(data)
                    load_time = (datetime.now() - start_time).total_seconds()
                    
                    logger.info(f"Loaded {rows_loaded} rows to {full_table_name} in {load_time:.2f}s")
                    
                    return {
                        "status": "success",
                        "rows_loaded": rows_loaded,
                        "table": full_table_name,
                        "mode": mode,
                        "load_time_seconds": load_time,
                        "rows_per_second": rows_loaded / load_time if load_time > 0 else 0
                    }
                    
        except Exception as e:
            logger.error(f"Error loading data to PostgreSQL: {str(e)}")
            raise
    
    async def execute_query(self, query: str) -> pd.DataFrame:
        """Execute a query and return results as DataFrame."""
        try:
            async with self._connection_pool.acquire() as conn:
                records = await conn.fetch(query)
                
                if records:
                    # Convert records to DataFrame
                    data = [dict(record) for record in records]
                    return pd.DataFrame(data)
                else:
                    return pd.DataFrame()
                    
        except Exception as e:
            logger.error(f"Error executing PostgreSQL query: {str(e)}")
            raise
    
    async def execute_transformation_sql(
        self,
        transformation_sql: str,
        source_table: str,
        target_table: str
    ) -> Dict[str, Any]:
        """Execute in-database transformation (ELT pattern)."""
        try:
            start_time = datetime.now()
            
            async with self._connection_pool.acquire() as conn:
                async with conn.transaction():
                    # Execute transformation
                    result = await conn.execute(transformation_sql)
                    
                    # Get affected rows count
                    rows_affected = int(result.split()[-1]) if result else 0
                    
                    execution_time = (datetime.now() - start_time).total_seconds()
                    
                    logger.info(f"Transformation completed: {rows_affected} rows affected in {execution_time:.2f}s")
                    
                    return {
                        "status": "success",
                        "rows_affected": rows_affected,
                        "execution_time_seconds": execution_time,
                        "source_table": source_table,
                        "target_table": target_table
                    }
                    
        except Exception as e:
            logger.error(f"Error executing transformation SQL: {str(e)}")
            raise
    
    def get_required_config_fields(self) -> List[str]:
        """Get list of required configuration fields."""
        return ["host", "database", "username", "password"]
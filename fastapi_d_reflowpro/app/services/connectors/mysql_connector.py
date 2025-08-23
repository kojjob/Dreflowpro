"""MySQL connector for ETL/ELT operations."""

import aiomysql
import pandas as pd
import logging
from typing import Dict, Any, List, AsyncGenerator, Optional
import asyncio
from datetime import datetime
import json

from .base_connector import BaseConnector

logger = logging.getLogger(__name__)


class MySQLConnector(BaseConnector):
    """MySQL database connector using aiomysql."""
    
    def __init__(self, connection_config: Dict[str, Any]):
        super().__init__(connection_config)
        self._connection_pool = None
    
    async def connect(self) -> bool:
        """Establish connection pool to MySQL."""
        try:
            # Extract connection parameters
            config = self.connection_config
            
            # Create connection pool
            self._connection_pool = await aiomysql.create_pool(
                host=config['host'],
                port=config.get('port', 3306),
                user=config['username'],
                password=config['password'],
                db=config['database'],
                minsize=config.get('min_connections', 1),
                maxsize=config.get('max_connections', 10),
                connect_timeout=config.get('timeout', 30),
                charset=config.get('charset', 'utf8mb4'),
                autocommit=False
            )
            
            self.is_connected = True
            logger.info(f"MySQL connection pool established: {config['host']}:{config.get('port', 3306)}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to MySQL: {str(e)}")
            self.is_connected = False
            return False
    
    async def disconnect(self) -> None:
        """Close connection pool."""
        try:
            if self._connection_pool:
                self._connection_pool.close()
                await self._connection_pool.wait_closed()
                self._connection_pool = None
            self.is_connected = False
            logger.info("MySQL connection pool closed")
        except Exception as e:
            logger.error(f"Error closing MySQL connection: {str(e)}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and return status."""
        try:
            start_time = datetime.now()
            
            if not self.is_connected:
                await self.connect()
            
            async with self._connection_pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    # Test query
                    await cursor.execute('SELECT VERSION()')
                    result = await cursor.fetchone()
                    response_time = (datetime.now() - start_time).total_seconds()
                    
                    return {
                        "status": "success",
                        "message": "Connection successful",
                        "server_version": result[0] if result else "Unknown",
                        "response_time_seconds": response_time,
                        "connection_pool_size": self._connection_pool.size
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
                async with conn.cursor(aiomysql.DictCursor) as cursor:
                    if table_name:
                        # Get specific table info
                        table_info_query = """
                            SELECT 
                                COLUMN_NAME as column_name,
                                DATA_TYPE as data_type,
                                IS_NULLABLE as is_nullable,
                                COLUMN_DEFAULT as column_default,
                                CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
                                NUMERIC_PRECISION as numeric_precision,
                                NUMERIC_SCALE as numeric_scale,
                                COLUMN_KEY as column_key,
                                EXTRA as extra
                            FROM INFORMATION_SCHEMA.COLUMNS 
                            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                            ORDER BY ORDINAL_POSITION
                        """
                        await cursor.execute(table_info_query, (self.connection_config["database"], table_name))
                        columns = await cursor.fetchall()
                        
                        # Get row count
                        count_query = f'SELECT COUNT(*) as count FROM `{table_name}`'
                        await cursor.execute(count_query)
                        count_result = await cursor.fetchone()
                        row_count = count_result['count'] if count_result else 0
                        
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
                                    "scale": col["numeric_scale"],
                                    "key": col["column_key"],
                                    "extra": col["extra"]
                                }
                                for col in columns
                            ]
                        }
                    else:
                        # Get all tables info
                        tables_query = """
                            SELECT 
                                TABLE_NAME as table_name,
                                TABLE_TYPE as table_type,
                                ENGINE as engine,
                                TABLE_ROWS as table_rows
                            FROM INFORMATION_SCHEMA.TABLES 
                            WHERE TABLE_SCHEMA = %s
                            ORDER BY TABLE_NAME
                        """
                        await cursor.execute(tables_query, (self.connection_config["database"],))
                        tables = await cursor.fetchall()
                        
                        return {
                            "database": self.connection_config["database"],
                            "tables": [
                                {
                                    "name": table["table_name"],
                                    "type": table["table_type"],
                                    "engine": table["engine"],
                                    "estimated_rows": table["table_rows"]
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
                
                column_str = ", ".join([f"`{col}`" for col in columns]) if isinstance(columns, list) and columns != ["*"] else "*"
                query = f'SELECT {column_str} FROM `{table}`'
                
                if where_clause:
                    query += f" WHERE {where_clause}"
                if order_by:
                    query += f" ORDER BY {order_by}"
            
            # Add limit if specified
            if limit:
                query += f" LIMIT {limit}"
            
            logger.info(f"Executing MySQL extraction query: {query[:100]}...")
            
            async with self._connection_pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cursor:
                    await cursor.execute(query)
                    
                    rows_processed = 0
                    while True:
                        batch_records = await cursor.fetchmany(batch_size)
                        
                        if not batch_records:
                            break
                        
                        # Convert to DataFrame
                        df = pd.DataFrame(batch_records)
                        rows_processed += len(df)
                        
                        logger.info(f"Extracted batch: {len(df)} rows (total: {rows_processed})")
                        yield df
                        
                        if limit and rows_processed >= limit:
                            break
                            
        except Exception as e:
            logger.error(f"Error extracting data from MySQL: {str(e)}")
            raise
    
    async def load_data(
        self,
        data: pd.DataFrame,
        destination_config: Dict[str, Any],
        mode: str = "append"
    ) -> Dict[str, Any]:
        """Load data to MySQL table using efficient bulk operations."""
        
        try:
            table_name = destination_config["table"]
            
            start_time = datetime.now()
            
            async with self._connection_pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    if mode == "replace":
                        # Truncate table
                        await cursor.execute(f"TRUNCATE TABLE `{table_name}`")
                    
                    # Prepare data for INSERT
                    columns = list(data.columns)
                    column_str = ", ".join([f"`{col}`" for col in columns])
                    placeholders = ", ".join(["%s"] * len(columns))
                    
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
                    
                    # Use executemany for bulk insert
                    insert_query = f"INSERT INTO `{table_name}` ({column_str}) VALUES ({placeholders})"
                    await cursor.executemany(insert_query, records)
                    await conn.commit()
                    
                    rows_loaded = len(data)
                    load_time = (datetime.now() - start_time).total_seconds()
                    
                    logger.info(f"Loaded {rows_loaded} rows to {table_name} in {load_time:.2f}s")
                    
                    return {
                        "status": "success",
                        "rows_loaded": rows_loaded,
                        "table": table_name,
                        "mode": mode,
                        "load_time_seconds": load_time,
                        "rows_per_second": rows_loaded / load_time if load_time > 0 else 0
                    }
                    
        except Exception as e:
            logger.error(f"Error loading data to MySQL: {str(e)}")
            raise
    
    async def execute_query(self, query: str) -> pd.DataFrame:
        """Execute a query and return results as DataFrame."""
        try:
            async with self._connection_pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cursor:
                    await cursor.execute(query)
                    records = await cursor.fetchall()
                    
                    if records:
                        # Convert records to DataFrame
                        return pd.DataFrame(records)
                    else:
                        return pd.DataFrame()
                        
        except Exception as e:
            logger.error(f"Error executing MySQL query: {str(e)}")
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
                async with conn.cursor() as cursor:
                    # Execute transformation
                    await cursor.execute(transformation_sql)
                    rows_affected = cursor.rowcount
                    await conn.commit()
                    
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
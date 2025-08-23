"""
Connector service for managing data connectors and their operations.
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.orm import selectinload

from ..models.connector import DataConnector, ConnectorType, ConnectorStatus, DataPreview
from ..schemas.connector import (
    ConnectorCreate, 
    ConnectorUpdate, 
    ConnectorTestRequest,
    ConnectorTestResponse,
    DataPreviewResponse
)
from .connectors.postgres_connector import PostgreSQLConnector
from .connectors.mysql_connector import MySQLConnector

logger = logging.getLogger(__name__)


class ConnectorService:
    """Service for managing data connectors."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_connector(
        self, 
        connector_data: ConnectorCreate, 
        user_id: Optional[UUID] = None,
        organization_id: Optional[UUID] = None
    ) -> DataConnector:
        """Create a new data connector."""
        try:
            # Create the connector instance
            db_connector = DataConnector(
                name=connector_data.name,
                description=connector_data.description,
                type=connector_data.type,
                status=ConnectorStatus.INACTIVE,
                connection_config=connector_data.connection_config,
                created_by_id=user_id,
                organization_id=organization_id
            )
            
            self.db.add(db_connector)
            await self.db.commit()
            await self.db.refresh(db_connector)
            
            logger.info(f"Created connector {db_connector.id} of type {connector_data.type}")
            return db_connector
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create connector: {str(e)}")
            raise
    
    async def get_connector(self, connector_id: UUID) -> Optional[DataConnector]:
        """Get a connector by ID."""
        try:
            result = await self.db.execute(
                select(DataConnector).where(DataConnector.id == connector_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to get connector {connector_id}: {str(e)}")
            raise
    
    async def get_connectors(
        self, 
        skip: int = 0, 
        limit: int = 100,
        connector_type: Optional[ConnectorType] = None,
        status: Optional[ConnectorStatus] = None,
        organization_id: Optional[UUID] = None
    ) -> Tuple[List[DataConnector], int]:
        """Get a list of connectors with filtering and pagination."""
        try:
            # Build the base query
            query = select(DataConnector)
            count_query = select(func.count(DataConnector.id))
            
            # Apply filters
            filters = []
            if connector_type:
                filters.append(DataConnector.type == connector_type)
            if status:
                filters.append(DataConnector.status == status)
            if organization_id:
                filters.append(DataConnector.organization_id == organization_id)
            
            if filters:
                query = query.where(and_(*filters))
                count_query = count_query.where(and_(*filters))
            
            # Apply ordering and pagination
            query = query.order_by(DataConnector.created_at.desc()).offset(skip).limit(limit)
            
            # Execute queries
            result = await self.db.execute(query)
            connectors = result.scalars().all()
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            return list(connectors), total
            
        except Exception as e:
            logger.error(f"Failed to get connectors: {str(e)}")
            raise
    
    async def update_connector(
        self, 
        connector_id: UUID, 
        connector_data: ConnectorUpdate
    ) -> Optional[DataConnector]:
        """Update an existing connector."""
        try:
            # Get the existing connector
            connector = await self.get_connector(connector_id)
            if not connector:
                return None
            
            # Update fields if provided
            update_data = {}
            if connector_data.name is not None:
                update_data['name'] = connector_data.name
            if connector_data.description is not None:
                update_data['description'] = connector_data.description
            if connector_data.status is not None:
                update_data['status'] = connector_data.status
            if connector_data.connection_config is not None:
                update_data['connection_config'] = connector_data.connection_config
            
            if update_data:
                update_data['updated_at'] = datetime.utcnow()
                
                await self.db.execute(
                    update(DataConnector)
                    .where(DataConnector.id == connector_id)
                    .values(**update_data)
                )
                await self.db.commit()
                
                # Refresh the connector
                await self.db.refresh(connector)
            
            logger.info(f"Updated connector {connector_id}")
            return connector
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update connector {connector_id}: {str(e)}")
            raise
    
    async def delete_connector(self, connector_id: UUID) -> bool:
        """Delete a connector."""
        try:
            # Check if connector exists
            connector = await self.get_connector(connector_id)
            if not connector:
                return False
            
            # Delete associated data previews first
            await self.db.execute(
                delete(DataPreview).where(DataPreview.connector_id == connector_id)
            )
            
            # Delete the connector
            await self.db.execute(
                delete(DataConnector).where(DataConnector.id == connector_id)
            )
            await self.db.commit()
            
            logger.info(f"Deleted connector {connector_id}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete connector {connector_id}: {str(e)}")
            raise
    
    async def test_connector(
        self, 
        connector_type: ConnectorType, 
        connection_config: Dict[str, Any]
    ) -> ConnectorTestResponse:
        """Test a connector connection."""
        start_time = datetime.utcnow()
        
        try:
            if connector_type == ConnectorType.DATABASE:
                # Determine database type from config
                db_type = connection_config.get('type', '').lower()
                
                if db_type == 'postgresql' or 'postgres' in db_type:
                    connector_instance = PostgreSQLConnector(connection_config)
                elif db_type == 'mysql':
                    connector_instance = MySQLConnector(connection_config)
                else:
                    return ConnectorTestResponse(
                        success=False,
                        message=f"Unsupported database type: {db_type}"
                    )
                
                # Test the connection
                try:
                    await connector_instance.connect()
                    
                    # Get schema information
                    schema_info = await connector_instance.get_schema_info()
                    tables = [table["name"] for table in schema_info.get("tables", [])]
                    schema_preview = {
                        "tables": tables[:10],  # First 10 tables
                        "table_count": len(tables),
                        "database": schema_info.get("database"),
                        "schema": schema_info.get("schema")
                    }
                    
                    # Get sample data from first table if available
                    sample_data = None
                    if tables:
                        try:
                            # Use the extract_data method with proper query_config
                            query_config = {"query": f"SELECT * FROM {tables[0]} LIMIT 5"}
                            async for batch in connector_instance.extract_data(query_config, batch_size=5, limit=5):
                                sample_data = batch.to_dict('records')
                                break  # Just get the first (and only) batch
                        except Exception as sample_error:
                            logger.warning(f"Failed to get sample data: {sample_error}")
                    
                    await connector_instance.disconnect()
                    
                    connection_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                    
                    return ConnectorTestResponse(
                        success=True,
                        message="Connection successful",
                        connection_time_ms=connection_time,
                        schema_preview=schema_preview,
                        sample_data=sample_data
                    )
                    
                except Exception as conn_error:
                    return ConnectorTestResponse(
                        success=False,
                        message=f"Connection failed: {str(conn_error)}"
                    )
            
            else:
                return ConnectorTestResponse(
                    success=False,
                    message=f"Testing not yet implemented for connector type: {connector_type}"
                )
                
        except Exception as e:
            logger.error(f"Failed to test connector: {str(e)}")
            return ConnectorTestResponse(
                success=False,
                message=f"Test failed: {str(e)}"
            )
    
    async def create_data_preview(
        self, 
        connector_id: UUID, 
        sample_data: List[Dict[str, Any]],
        row_count: Optional[int] = None,
        column_info: Optional[Dict[str, Any]] = None
    ) -> DataPreview:
        """Create a data preview for a connector."""
        try:
            preview = DataPreview(
                connector_id=connector_id,
                preview_data=sample_data,
                row_count=row_count,
                column_info=column_info
            )
            
            self.db.add(preview)
            await self.db.commit()
            await self.db.refresh(preview)
            
            logger.info(f"Created data preview for connector {connector_id}")
            return preview
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create data preview: {str(e)}")
            raise
    
    async def get_data_preview(self, connector_id: UUID) -> Optional[DataPreview]:
        """Get the latest data preview for a connector."""
        try:
            result = await self.db.execute(
                select(DataPreview)
                .where(DataPreview.connector_id == connector_id)
                .order_by(DataPreview.created_at.desc())
                .limit(1)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Failed to get data preview for connector {connector_id}: {str(e)}")
            raise
    
    async def update_connector_status(
        self, 
        connector_id: UUID, 
        status: ConnectorStatus,
        last_tested: Optional[datetime] = None
    ) -> bool:
        """Update connector status and optionally last tested time."""
        try:
            update_data = {'status': status, 'updated_at': datetime.utcnow()}
            if last_tested:
                update_data['last_tested'] = last_tested
            
            await self.db.execute(
                update(DataConnector)
                .where(DataConnector.id == connector_id)
                .values(**update_data)
            )
            await self.db.commit()
            
            logger.info(f"Updated connector {connector_id} status to {status}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update connector status: {str(e)}")
            raise
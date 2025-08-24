from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import datetime
import math

from ....core.database import get_session
from ....schemas.connector import (
    ConnectorCreate,
    ConnectorUpdate,
    ConnectorResponse,
    ConnectorList,
    ConnectorTestRequest,
    ConnectorTestResponse,
    DataPreviewResponse
)
from ....models.connector import ConnectorType, ConnectorStatus
from ....services.connector_service import ConnectorService

router = APIRouter()


@router.post("/", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
async def create_connector(
    connector_data: ConnectorCreate,
    db: AsyncSession = Depends(get_session)
):
    """Create a new data connector."""
    try:
        service = ConnectorService(db)
        connector = await service.create_connector(
            connector_data=connector_data,
            user_id=None  # No user authentication for now
        )
        return ConnectorResponse.model_validate(connector)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create connector: {str(e)}"
        )


@router.get("/", response_model=ConnectorList)
async def list_connectors(
    skip: int = Query(0, ge=0, description="Number of connectors to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of connectors to return"),
    type: Optional[ConnectorType] = Query(None, description="Filter by connector type"),
    status: Optional[ConnectorStatus] = Query(None, description="Filter by connector status"),
    db: AsyncSession = Depends(get_session)
):
    """List data connectors with filtering and pagination."""
    try:
        service = ConnectorService(db)
        connectors, total = await service.get_connectors(
            skip=skip,
            limit=limit,
            connector_type=type,
            status=status
        )
        
        pages = math.ceil(total / limit) if limit > 0 else 1
        page = (skip // limit) + 1 if limit > 0 else 1
        
        return ConnectorList(
            connectors=[ConnectorResponse.model_validate(conn) for conn in connectors],
            total=total,
            page=page,
            size=len(connectors),
            pages=pages
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list connectors: {str(e)}"
        )


@router.get("/{connector_id}", response_model=ConnectorResponse)
async def get_connector(
    connector_id: UUID,
    db: AsyncSession = Depends(get_session)
):
    """Get a specific data connector by ID."""
    try:
        service = ConnectorService(db)
        connector = await service.get_connector(connector_id)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )
        
        return ConnectorResponse.model_validate(connector)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connector: {str(e)}"
        )


@router.put("/{connector_id}", response_model=ConnectorResponse)
async def update_connector(
    connector_id: UUID,
    connector_data: ConnectorUpdate,
    db: AsyncSession = Depends(get_session)
):
    """Update an existing data connector."""
    try:
        service = ConnectorService(db)
        connector = await service.update_connector(connector_id, connector_data)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )
        
        return ConnectorResponse.model_validate(connector)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connector: {str(e)}"
        )


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: UUID,
    db: AsyncSession = Depends(get_session)
):
    """Delete a data connector."""
    try:
        service = ConnectorService(db)
        deleted = await service.delete_connector(connector_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connector: {str(e)}"
        )


@router.post("/test", response_model=ConnectorTestResponse)
async def test_connector_connection(
    test_request: ConnectorTestRequest,
    connector_type: ConnectorType = Query(..., description="Type of connector to test"),
    db: AsyncSession = Depends(get_session)
):
    """Test a connector connection without creating the connector."""
    try:
        service = ConnectorService(db)
        result = await service.test_connector(
            connector_type=connector_type,
            connection_config=test_request.connection_config
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test connector: {str(e)}"
        )


@router.post("/{connector_id}/test", response_model=ConnectorTestResponse)
async def test_existing_connector(
    connector_id: UUID,
    db: AsyncSession = Depends(get_session)
):
    """Test an existing connector's connection."""
    try:
        service = ConnectorService(db)
        connector = await service.get_connector(connector_id)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )
        
        result = await service.test_connector(
            connector_type=connector.type,
            connection_config=connector.connection_config
        )
        
        # Update connector status based on test result
        new_status = ConnectorStatus.ACTIVE if result.success else ConnectorStatus.ERROR
        await service.update_connector_status(
            connector_id=connector_id,
            status=new_status,
            last_tested=datetime.utcnow()
        )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test connector: {str(e)}"
        )


@router.get("/{connector_id}/preview", response_model=DataPreviewResponse)
async def get_data_preview(
    connector_id: UUID,
    db: AsyncSession = Depends(get_session)
):
    """Get data preview for a connector."""
    try:
        service = ConnectorService(db)
        
        # Check if connector exists
        connector = await service.get_connector(connector_id)
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Connector {connector_id} not found"
            )
        
        # Get existing preview
        preview = await service.get_data_preview(connector_id)
        if not preview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data preview available for connector {connector_id}"
            )
        
        return DataPreviewResponse.model_validate(preview)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get data preview: {str(e)}"
        )
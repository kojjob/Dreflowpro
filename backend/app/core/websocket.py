"""
WebSocket manager for real-time data streaming and pipeline monitoring.
"""
import json
import uuid
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
import logging
from enum import Enum

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class MessageType(str, Enum):
    """WebSocket message types."""
    PIPELINE_STATUS = "pipeline_status"
    PIPELINE_PROGRESS = "pipeline_progress"
    DATA_QUALITY_ALERT = "data_quality_alert"
    SYSTEM_NOTIFICATION = "system_notification"
    ANALYTICS_UPDATE = "analytics_update"
    ERROR_NOTIFICATION = "error_notification"


class WebSocketManager:
    """Manages WebSocket connections and message broadcasting."""
    
    def __init__(self):
        # Active connections organized by user and organization
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.user_organizations: Dict[str, str] = {}  # user_id -> org_id
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, org_id: str, connection_id: str = None):
        """Accept WebSocket connection and register user."""
        await websocket.accept()
        
        if connection_id is None:
            connection_id = str(uuid.uuid4())
        
        # Initialize organization group if needed
        if org_id not in self.active_connections:
            self.active_connections[org_id] = {}
        
        # Store connection
        self.active_connections[org_id][connection_id] = websocket
        self.user_organizations[connection_id] = org_id
        self.connection_metadata[connection_id] = {
            'user_id': user_id,
            'org_id': org_id,
            'connected_at': datetime.utcnow(),
            'last_ping': datetime.utcnow()
        }
        
        logger.info(f"WebSocket connected: user={user_id}, org={org_id}, connection={connection_id}")
        
        # Send connection confirmation
        await self.send_personal_message({
            'type': MessageType.SYSTEM_NOTIFICATION,
            'message': 'Connected to real-time updates',
            'timestamp': datetime.utcnow().isoformat(),
            'connection_id': connection_id
        }, connection_id)
        
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Remove WebSocket connection."""
        org_id = self.user_organizations.get(connection_id)
        if org_id and connection_id in self.active_connections.get(org_id, {}):
            del self.active_connections[org_id][connection_id]
            del self.user_organizations[connection_id]
            
            # Clean up empty organization groups
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
                
            if connection_id in self.connection_metadata:
                del self.connection_metadata[connection_id]
                
            logger.info(f"WebSocket disconnected: connection={connection_id}")
    
    async def send_personal_message(self, message: Dict[str, Any], connection_id: str):
        """Send message to specific connection."""
        org_id = self.user_organizations.get(connection_id)
        if org_id and connection_id in self.active_connections.get(org_id, {}):
            try:
                websocket = self.active_connections[org_id][connection_id]
                await websocket.send_text(json.dumps(message, default=str))
                
                # Update last communication timestamp
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]['last_ping'] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(f"Failed to send personal message to {connection_id}: {e}")
                self.disconnect(connection_id)
    
    async def send_to_user(self, message: Dict[str, Any], user_id: str):
        """Send message to all connections for a specific user."""
        connections_to_send = []
        for conn_id, metadata in self.connection_metadata.items():
            if metadata['user_id'] == user_id:
                connections_to_send.append(conn_id)
        
        for connection_id in connections_to_send:
            await self.send_personal_message(message, connection_id)
    
    async def broadcast_to_organization(self, message: Dict[str, Any], org_id: str):
        """Broadcast message to all connections in an organization."""
        if org_id not in self.active_connections:
            return
        
        disconnected_connections = []
        for connection_id, websocket in self.active_connections[org_id].items():
            try:
                await websocket.send_text(json.dumps(message, default=str))
                
                # Update last communication timestamp
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]['last_ping'] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(f"Failed to broadcast to {connection_id}: {e}")
                disconnected_connections.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected_connections:
            self.disconnect(connection_id)
    
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast message to all active connections."""
        for org_id in list(self.active_connections.keys()):
            await self.broadcast_to_organization(message, org_id)
    
    async def send_pipeline_status(self, pipeline_id: str, status: str, progress: int, org_id: str, details: Dict[str, Any] = None):
        """Send pipeline status update."""
        message = {
            'type': MessageType.PIPELINE_STATUS,
            'pipeline_id': pipeline_id,
            'status': status,
            'progress': progress,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        await self.broadcast_to_organization(message, org_id)
    
    async def send_data_quality_alert(self, alert_data: Dict[str, Any], org_id: str):
        """Send data quality alert."""
        message = {
            'type': MessageType.DATA_QUALITY_ALERT,
            'alert': alert_data,
            'timestamp': datetime.utcnow().isoformat(),
            'severity': alert_data.get('severity', 'warning')
        }
        await self.broadcast_to_organization(message, org_id)
    
    async def send_analytics_update(self, analytics_data: Dict[str, Any], org_id: str):
        """Send real-time analytics update."""
        message = {
            'type': MessageType.ANALYTICS_UPDATE,
            'data': analytics_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        await self.broadcast_to_organization(message, org_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics."""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        return {
            'total_connections': total_connections,
            'organizations_connected': len(self.active_connections),
            'connections_by_org': {
                org_id: len(connections) 
                for org_id, connections in self.active_connections.items()
            },
            'active_users': len(set(
                metadata['user_id'] 
                for metadata in self.connection_metadata.values()
            ))
        }
    
    async def health_check(self):
        """Perform health check on all connections."""
        current_time = datetime.utcnow()
        stale_connections = []
        
        for connection_id, metadata in self.connection_metadata.items():
            # Check if connection is stale (no activity for 5 minutes)
            time_diff = (current_time - metadata['last_ping']).total_seconds()
            if time_diff > 300:  # 5 minutes
                stale_connections.append(connection_id)
        
        # Send ping to stale connections or disconnect them
        for connection_id in stale_connections:
            try:
                await self.send_personal_message({
                    'type': MessageType.SYSTEM_NOTIFICATION,
                    'message': 'ping',
                    'timestamp': current_time.isoformat()
                }, connection_id)
            except Exception:
                self.disconnect(connection_id)


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


class StreamingDataProcessor:
    """Processes and streams data updates in real-time."""
    
    def __init__(self, ws_manager: WebSocketManager):
        self.ws_manager = ws_manager
        self.processing_queues: Dict[str, asyncio.Queue] = {}
        
    async def start_pipeline_monitoring(self, pipeline_id: str, org_id: str):
        """Start monitoring a pipeline execution."""
        # Create processing queue for this pipeline
        self.processing_queues[pipeline_id] = asyncio.Queue()
        
        # Start background task to process updates
        asyncio.create_task(self._process_pipeline_updates(pipeline_id, org_id))
        
        logger.info(f"Started monitoring pipeline {pipeline_id}")
    
    async def _process_pipeline_updates(self, pipeline_id: str, org_id: str):
        """Process pipeline updates from queue."""
        queue = self.processing_queues[pipeline_id]
        
        try:
            while True:
                update = await queue.get()
                if update is None:  # Shutdown signal
                    break
                
                await self.ws_manager.send_pipeline_status(
                    pipeline_id=pipeline_id,
                    status=update['status'],
                    progress=update['progress'],
                    org_id=org_id,
                    details=update.get('details', {})
                )
                
                queue.task_done()
        except Exception as e:
            logger.error(f"Error processing pipeline updates for {pipeline_id}: {e}")
        finally:
            # Cleanup
            if pipeline_id in self.processing_queues:
                del self.processing_queues[pipeline_id]
    
    async def queue_pipeline_update(self, pipeline_id: str, status: str, progress: int, details: Dict[str, Any] = None):
        """Queue a pipeline update for streaming."""
        if pipeline_id in self.processing_queues:
            await self.processing_queues[pipeline_id].put({
                'status': status,
                'progress': progress,
                'details': details or {}
            })
    
    async def stop_pipeline_monitoring(self, pipeline_id: str):
        """Stop monitoring a pipeline."""
        if pipeline_id in self.processing_queues:
            await self.processing_queues[pipeline_id].put(None)  # Shutdown signal


# Global streaming processor instance
streaming_processor = StreamingDataProcessor(websocket_manager)
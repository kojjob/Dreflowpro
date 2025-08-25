"""
WebSocket and Server-Sent Events endpoints for real-time data streaming.
"""
import asyncio
import json
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_websocket
from app.core.deps import get_current_user
from app.core.websocket import websocket_manager, streaming_processor, MessageType
from app.models.user import User
from app.schemas.websocket import WebSocketMessage, StreamingEvent
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/streaming", tags=["Real-time Streaming"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Main WebSocket endpoint for real-time updates."""
    connection_id = None
    
    try:
        # Authenticate user
        if not token:
            await websocket.close(code=4001, reason="Authentication token required")
            return
            
        user = await get_current_user_websocket(token, db)
        if not user:
            await websocket.close(code=4001, reason="Invalid authentication token")
            return
        
        # Connect to WebSocket manager
        connection_id = await websocket_manager.connect(
            websocket=websocket,
            user_id=str(user.id),
            org_id=str(user.organization_id)
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for incoming message with timeout
                message_data = await asyncio.wait_for(
                    websocket.receive_text(), 
                    timeout=30.0
                )
                
                # Parse and handle message
                try:
                    message = json.loads(message_data)
                    await handle_websocket_message(message, connection_id, user, db)
                except json.JSONDecodeError:
                    await websocket_manager.send_personal_message({
                        'type': MessageType.ERROR_NOTIFICATION,
                        'message': 'Invalid JSON message format',
                        'timestamp': datetime.utcnow().isoformat()
                    }, connection_id)
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                await websocket_manager.send_personal_message({
                    'type': MessageType.SYSTEM_NOTIFICATION,
                    'message': 'heartbeat',
                    'timestamp': datetime.utcnow().isoformat()
                }, connection_id)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.id if 'user' in locals() else 'unknown'}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if connection_id:
            websocket_manager.disconnect(connection_id)


async def handle_websocket_message(message: dict, connection_id: str, user: User, db: AsyncSession):
    """Handle incoming WebSocket messages."""
    message_type = message.get('type')
    
    if message_type == 'subscribe_pipeline':
        pipeline_id = message.get('pipeline_id')
        if pipeline_id:
            # Start monitoring specific pipeline
            await streaming_processor.start_pipeline_monitoring(
                pipeline_id=pipeline_id,
                org_id=str(user.organization_id)
            )
            
            await websocket_manager.send_personal_message({
                'type': MessageType.SYSTEM_NOTIFICATION,
                'message': f'Subscribed to pipeline {pipeline_id} updates',
                'timestamp': datetime.utcnow().isoformat()
            }, connection_id)
    
    elif message_type == 'unsubscribe_pipeline':
        pipeline_id = message.get('pipeline_id')
        if pipeline_id:
            await streaming_processor.stop_pipeline_monitoring(pipeline_id)
            
            await websocket_manager.send_personal_message({
                'type': MessageType.SYSTEM_NOTIFICATION,
                'message': f'Unsubscribed from pipeline {pipeline_id} updates',
                'timestamp': datetime.utcnow().isoformat()
            }, connection_id)
    
    elif message_type == 'get_status':
        # Send current connection stats
        stats = websocket_manager.get_connection_stats()
        await websocket_manager.send_personal_message({
            'type': MessageType.SYSTEM_NOTIFICATION,
            'message': 'Connection statistics',
            'data': stats,
            'timestamp': datetime.utcnow().isoformat()
        }, connection_id)
    
    else:
        await websocket_manager.send_personal_message({
            'type': MessageType.ERROR_NOTIFICATION,
            'message': f'Unknown message type: {message_type}',
            'timestamp': datetime.utcnow().isoformat()
        }, connection_id)


@router.get("/sse/pipeline/{pipeline_id}")
async def pipeline_sse_stream(
    pipeline_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Server-Sent Events stream for pipeline monitoring."""
    
    async def generate_sse_events():
        """Generate Server-Sent Events for pipeline updates."""
        last_event_id = request.headers.get("Last-Event-ID", "0")
        event_counter = int(last_event_id) if last_event_id.isdigit() else 0
        
        # Send initial connection event
        event_counter += 1
        yield f"id: {event_counter}\n"
        yield f"event: connected\n"
        yield f"data: {json.dumps({'message': 'Connected to pipeline stream', 'pipeline_id': pipeline_id, 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        try:
            # Create a queue for this SSE connection
            event_queue = asyncio.Queue()
            
            # Start pipeline monitoring (this would integrate with your pipeline execution system)
            await streaming_processor.start_pipeline_monitoring(
                pipeline_id=pipeline_id,
                org_id=str(current_user.organization_id)
            )
            
            # Simulate real-time pipeline events (replace with actual pipeline integration)
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for events with timeout
                    event_data = await asyncio.wait_for(event_queue.get(), timeout=30.0)
                    
                    event_counter += 1
                    yield f"id: {event_counter}\n"
                    yield f"event: pipeline_update\n"
                    yield f"data: {json.dumps(event_data, default=str)}\n\n"
                    
                except asyncio.TimeoutError:
                    # Send heartbeat
                    event_counter += 1
                    yield f"id: {event_counter}\n"
                    yield f"event: heartbeat\n"
                    yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat()})}\n\n"
                
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            event_counter += 1
            yield f"id: {event_counter}\n"
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        finally:
            # Cleanup
            await streaming_processor.stop_pipeline_monitoring(pipeline_id)
    
    return StreamingResponse(
        generate_sse_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )


@router.get("/sse/analytics")
async def analytics_sse_stream(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Server-Sent Events stream for real-time analytics updates."""
    
    async def generate_analytics_events():
        """Generate real-time analytics events."""
        event_counter = 0
        
        # Send initial connection event
        event_counter += 1
        yield f"id: {event_counter}\n"
        yield f"event: connected\n"
        yield f"data: {json.dumps({'message': 'Connected to analytics stream', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Generate sample analytics data (replace with real analytics)
                analytics_data = {
                    'active_pipelines': 5,
                    'completed_today': 12,
                    'success_rate': 0.95,
                    'data_processed_gb': 2.3,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                event_counter += 1
                yield f"id: {event_counter}\n"
                yield f"event: analytics_update\n"
                yield f"data: {json.dumps(analytics_data)}\n\n"
                
                # Wait 10 seconds before next update
                await asyncio.sleep(10)
                
        except Exception as e:
            logger.error(f"Analytics SSE stream error: {e}")
            event_counter += 1
            yield f"id: {event_counter}\n"
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    return StreamingResponse(
        generate_analytics_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        }
    )


@router.post("/broadcast/{organization_id}")
async def broadcast_message(
    organization_id: str,
    message: WebSocketMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Broadcast message to all WebSocket connections in an organization."""
    
    # Verify user has permission to broadcast to this organization
    if str(current_user.organization_id) != organization_id:
        raise HTTPException(status_code=403, detail="Not authorized to broadcast to this organization")
    
    message_data = {
        'type': message.type,
        'message': message.message,
        'data': message.data,
        'timestamp': datetime.utcnow().isoformat(),
        'sender': current_user.email
    }
    
    await websocket_manager.broadcast_to_organization(message_data, organization_id)
    
    return {
        'message': 'Broadcast sent successfully',
        'recipients': len(websocket_manager.active_connections.get(organization_id, {})),
        'timestamp': datetime.utcnow().isoformat()
    }


@router.get("/stats")
async def get_streaming_stats(
    current_user: User = Depends(get_current_user)
):
    """Get WebSocket connection statistics."""
    stats = websocket_manager.get_connection_stats()
    
    return {
        'connection_stats': stats,
        'timestamp': datetime.utcnow().isoformat(),
        'user_organization': str(current_user.organization_id)
    }
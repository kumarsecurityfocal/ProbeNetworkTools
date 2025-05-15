"""
WebSocket router for probe node real-time communication.
This module implements ZTNA-style persistent connections from probe nodes.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import json
import logging
import uuid
import random
from pydantic import ValidationError

from .. import models, auth, schemas
from ..database import get_db
from sqlalchemy.orm import Session

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websockets"])

# Store active connections
# node_uuid -> WebSocket connection
active_connections: Dict[str, WebSocket] = {}

# Store node region information
# node_uuid -> region
node_regions: Dict[str, str] = {}

# API key header for WebSocket authentication
API_KEY_HEADER = APIKeyHeader(name="Authorization")

async def get_node_from_api_key(api_key: str, db: Session) -> Optional[models.ProbeNode]:
    """Validate API key and return the associated probe node."""
    if not api_key or not api_key.startswith("Bearer "):
        return None
    
    # Extract the actual key from "Bearer <key>"
    key = api_key.split("Bearer ")[1].strip()
    
    # Query for the node with this API key
    node = db.query(models.ProbeNode).filter(models.ProbeNode.api_key == key).first()
    return node


@router.websocket("/node")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for probe nodes to establish persistent connections.
    Nodes authenticate with their API key and maintain an open connection.
    The server uses this connection to send diagnostic job requests.
    """
    # Wait for connection
    await websocket.accept()
    node_uuid = None
    connection_id = str(uuid.uuid4())
    
    try:
        # Expect initial authentication message
        auth_data = await websocket.receive_json()
        
        try:
            # Validate auth data with our schema
            ws_auth = schemas.WebSocketNodeAuth(**auth_data)
            
            # Get node from database
            node = db.query(models.ProbeNode).filter(
                models.ProbeNode.node_uuid == ws_auth.node_uuid,
                models.ProbeNode.api_key == ws_auth.api_key
            ).first()
            
        except ValidationError:
            # Fallback for legacy clients that don't follow the schema yet
            if "api_key" not in auth_data or "node_uuid" not in auth_data:
                await websocket.send_json({
                    "status": "error", 
                    "message": "Invalid authentication format",
                    "details": "Expected node_uuid and api_key"
                })
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
                
            # Try to get node with just the API key
            api_key = auth_data["api_key"]
            node = await get_node_from_api_key(f"Bearer {api_key}", db)
            
        if not node:
            await websocket.send_json({
                "status": "error", 
                "message": "Authentication failed",
                "details": "Invalid node_uuid or api_key"
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Handle case where node is already connected
        node_uuid = node.node_uuid
        if node_uuid in active_connections:
            # Only one connection per node allowed - close the new one
            await websocket.send_json({
                "status": "error", 
                "message": "Node already connected",
                "details": "Only one active connection per node is allowed"
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Store connection and node information
        active_connections[node_uuid] = websocket
        node_regions[node_uuid] = node.region
        
        # Update node status in database
        node.status = "active"
        node.is_active = True
        node.connection_type = "websocket"
        node.last_heartbeat = datetime.utcnow()
        node.last_connected = datetime.utcnow()
        node.connection_id = connection_id
        node.reconnect_count = node.reconnect_count + 1 if node.reconnect_count else 1
        db.commit()
        
        logger.info(f"Node {node.name} ({node_uuid}) connected via WebSocket (conn_id: {connection_id})")
        
        # Calculate reconnection parameters for client
        min_delay = 1000  # 1 second in ms
        max_delay = 30000  # 30 seconds in ms
        jitter_factor = 0.1  # 10% jitter
        
        # Send confirmation with reconnection parameters
        await websocket.send_json({
            "status": "connected",
            "message": f"Connected successfully as {node.name}",
            "node_uuid": node_uuid,
            "connection_id": connection_id,
            "reconnect": {
                "min_delay": min_delay,
                "max_delay": max_delay,
                "jitter_factor": jitter_factor,
                "initial_delay": min_delay
            },
            "server_time": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages from the node
            data = await websocket.receive_json()
            
            if "type" not in data:
                await websocket.send_json({"status": "error", "message": "Invalid message format"})
                continue
                
            # Handle heartbeat message
            if data["type"] == "heartbeat":
                try:
                    # Try to parse as our schema
                    heartbeat = schemas.WebSocketHeartbeatMessage(**data)
                    
                    # Update node heartbeat in DB
                    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
                    if node:
                        node.last_heartbeat = datetime.utcnow()
                        node.current_load = heartbeat.current_load
                        # Update other metrics from heartbeat
                        db.commit()
                        
                except ValidationError:
                    # Legacy heartbeat format
                    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
                    if node:
                        node.last_heartbeat = datetime.utcnow()
                        if "load" in data:
                            node.current_load = float(data["load"])
                        if "error_count" in data:
                            node.error_count = data["error_count"]
                        db.commit()
                
                # Acknowledge heartbeat
                await websocket.send_json({
                    "status": "ok", 
                    "type": "heartbeat_ack",
                    "server_time": datetime.utcnow().isoformat()
                })
                
            # Handle diagnostic response    
            elif data["type"] == "diagnostic_response":
                # Process result and store it
                if "request_id" in data and "result" in data:
                    # TODO: Store the result in the database
                    logger.info(f"Received diagnostic result from {node_uuid} for request {data['request_id']}")
                    
                    # Acknowledge receipt
                    await websocket.send_json({
                        "status": "ok", 
                        "type": "result_received", 
                        "request_id": data["request_id"]
                    })
                    
            # Other message types can be handled here
            
    except WebSocketDisconnect:
        logger.info(f"Node {node_uuid} disconnected from WebSocket (conn_id: {connection_id})")
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {str(e)}")
    finally:
        # Clean up on disconnect
        if node_uuid and node_uuid in active_connections:
            del active_connections[node_uuid]
            if node_uuid in node_regions:
                del node_regions[node_uuid]
                
            # Update node status in database
            node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
            if node:
                node.status = "disconnected"
                node.connection_type = None
                node.connection_id = None
                db.commit()


async def send_diagnostic_job(node_uuid: str, tool: str, target: str, parameters: Dict[str, Any] = None, priority: int = 1, timeout: int = 30) -> Optional[str]:
    """
    Send a diagnostic job to a connected node via WebSocket.
    Returns the request_id if successful, None if the node is not connected.
    
    Args:
        node_uuid: UUID of the target node
        tool: Diagnostic tool to run (ping, traceroute, dns, etc.)
        target: Target hostname or IP address
        parameters: Optional parameters for the diagnostic tool
        priority: Job priority (higher number = higher priority)
        timeout: Timeout in seconds
        
    Returns:
        request_id string if job was sent successfully, None otherwise
    """
    if node_uuid not in active_connections:
        logger.error(f"Node {node_uuid} not connected via WebSocket")
        return None
        
    websocket = active_connections[node_uuid]
    request_id = str(uuid.uuid4())
    
    try:
        # Send using schema format
        command_message = {
            "type": "diagnostic_job",
            "request_id": request_id,
            "tool": tool,
            "target": target,
            "parameters": parameters or {},
            "priority": priority,
            "timeout": timeout,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await websocket.send_json(command_message)
        logger.info(f"Sent diagnostic job to node {node_uuid}: {tool} {target} (priority: {priority})")
        return request_id
    except Exception as e:
        logger.error(f"Error sending job to node {node_uuid}: {str(e)}")
        return None


def get_connected_nodes_in_region(region: Optional[str] = None) -> List[str]:
    """Get list of connected node UUIDs, filtered by region if specified."""
    if not region:
        return list(active_connections.keys())
        
    return [
        node_uuid for node_uuid, node_region in node_regions.items()
        if node_region == region and node_uuid in active_connections
    ]


def get_connected_node_count() -> int:
    """Get count of currently connected nodes."""
    return len(active_connections)
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

from .. import models, auth
from ..database import get_db, Session
from sqlalchemy.orm import Session as SQLAlchemySession

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

async def get_node_from_api_key(api_key: str, db: SQLAlchemySession) -> Optional[models.ProbeNode]:
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
    
    try:
        # Expect initial authentication message
        auth_data = await websocket.receive_json()
        if "api_key" not in auth_data:
            await websocket.send_json({"status": "error", "message": "Missing API key"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Validate API key and get node
        api_key = auth_data["api_key"]
        node = await get_node_from_api_key(api_key, db)
        
        if not node:
            await websocket.send_json({"status": "error", "message": "Invalid API key"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        # Store connection and node information
        node_uuid = node.node_uuid
        active_connections[node_uuid] = websocket
        node_regions[node_uuid] = node.region
        
        # Update node status in database
        node.status = "active"
        node.is_active = True
        node.connection_type = "websocket"
        node.last_heartbeat = datetime.utcnow()
        db.commit()
        
        logger.info(f"Node {node.name} ({node_uuid}) connected via WebSocket")
        
        # Send confirmation
        await websocket.send_json({
            "status": "connected",
            "message": f"Connected successfully as {node.name}",
            "node_uuid": node_uuid
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
                # Update node heartbeat in DB
                node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
                if node:
                    node.last_heartbeat = datetime.utcnow()
                    if "load" in data:
                        node.current_load = float(data["load"])
                    if "error_count" in data:
                        node.error_count = data["error_count"]
                    db.commit()
                    
                await websocket.send_json({"status": "ok", "type": "heartbeat_ack"})
                
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
        logger.info(f"Node {node_uuid} disconnected from WebSocket")
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
                db.commit()


async def send_diagnostic_job(node_uuid: str, tool: str, target: str, parameters: Dict[str, Any] = None) -> str:
    """
    Send a diagnostic job to a connected node via WebSocket.
    Returns the request_id if successful, None if the node is not connected.
    """
    if node_uuid not in active_connections:
        logger.error(f"Node {node_uuid} not connected via WebSocket")
        return None
        
    websocket = active_connections[node_uuid]
    request_id = str(uuid.uuid4())
    
    try:
        await websocket.send_json({
            "type": "diagnostic_job",
            "request_id": request_id,
            "tool": tool,
            "target": target,
            "parameters": parameters or {}
        })
        logger.info(f"Sent diagnostic job to node {node_uuid}: {tool} {target}")
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
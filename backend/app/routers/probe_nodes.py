"""
Router for probe node management endpoints.
These endpoints allow for probe node registration, heartbeats, and management.
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import logging
import uuid

from .. import models, schemas, auth
from ..database import get_db
from ..config import settings

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/probe-nodes", tags=["probe_nodes"])


def generate_node_api_key() -> str:
    """Generate a secure random API key for a probe node."""
    return f"pnode_{secrets.token_urlsafe(32)}"


def get_registration_token(db: Session, token: str) -> models.NodeRegistrationToken:
    """Validate a registration token and return it if valid."""
    token_record = db.query(models.NodeRegistrationToken).filter(
        models.NodeRegistrationToken.token == token,
        models.NodeRegistrationToken.is_used == False,
        models.NodeRegistrationToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired registration token"
        )
    
    return token_record


@router.post("/register", response_model=schemas.ProbeNodeRegistrationResponse)
async def register_node(
    node_data: schemas.ProbeNodeCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new probe node in the system.
    This endpoint is used for the initial node registration using a valid registration token.
    """
    # Validate registration token
    try:
        token_record = get_registration_token(db, node_data.registration_token)
    except HTTPException as e:
        logger.warning(f"Failed node registration attempt: {e.detail}")
        raise
    
    # Create the new node
    api_key = generate_node_api_key()
    node_uuid = str(uuid.uuid4())
    
    new_node = models.ProbeNode(
        name=node_data.name,
        hostname=node_data.hostname,
        node_uuid=node_uuid,
        region=node_data.region,
        zone=node_data.zone,
        internal_ip=node_data.internal_ip,
        external_ip=node_data.external_ip,
        version=node_data.version,
        api_key=api_key,
        status="registered",
        supported_tools=node_data.supported_tools or {"ping": True, "traceroute": True, "dns": True, "http": True},
        hardware_info=node_data.hardware_info or {},
        network_info=node_data.network_info or {},
        config={"initial_registration": datetime.utcnow().isoformat()},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Mark token as used
    token_record.is_used = True
    token_record.used_at = datetime.utcnow()
    token_record.node_id = new_node.id
    
    try:
        db.add(new_node)
        db.commit()
        db.refresh(new_node)
        
        # Update token with node ID now that we have it
        token_record.node_id = new_node.id
        db.commit()
        
        logger.info(f"New probe node registered: {new_node.name} ({new_node.node_uuid})")
        
        return schemas.ProbeNodeRegistrationResponse(
            node_uuid=new_node.node_uuid,
            api_key=api_key,
            status="registered",
            config={"welcome_message": "Node registered successfully", "check_interval": 60},
            message="Node registration successful"
        )
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database error during node registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node registration failed due to database constraint"
        )


@router.post("/heartbeat")
async def node_heartbeat(
    heartbeat: schemas.ProbeNodeHeartbeat,
    db: Session = Depends(get_db),
    api_key: str = Body(..., embed=True)
):
    """
    Update node status with a heartbeat.
    This endpoint is called periodically by active probe nodes.
    """
    # Find the node by UUID and validate API key
    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == heartbeat.node_uuid).first()
    
    if not node or node.api_key != api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid node identifier or API key"
        )
    
    # Update node status
    node.last_heartbeat = datetime.utcnow()
    node.current_load = heartbeat.current_load
    node.avg_response_time = heartbeat.avg_response_time
    node.error_count += heartbeat.error_count
    
    if heartbeat.version:
        node.version = heartbeat.version
    
    # If node was previously in error state, reset it to active
    if node.status == "error":
        node.status = "active"
    
    db.commit()
    
    # Return any configuration updates or commands
    return {
        "status": "acknowledged",
        "config_update": node.config,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("", response_model=List[schemas.ProbeNodeResponse])
async def get_nodes(
    region: Optional[str] = None,
    status: Optional[str] = None,
    active_only: bool = Query(False, description="Only return active nodes"),
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all probe nodes (admin only).
    This endpoint returns a list of all probe nodes in the system.
    """
    query = db.query(models.ProbeNode)
    
    # Apply filters
    if region:
        query = query.filter(models.ProbeNode.region == region)
    
    if status:
        query = query.filter(models.ProbeNode.status == status)
    
    if active_only:
        query = query.filter(models.ProbeNode.is_active == True)
    
    # Get results with pagination
    nodes = query.offset(skip).limit(limit).all()
    
    return nodes


@router.get("/{node_uuid}", response_model=schemas.ProbeNodeAdminResponse)
async def get_node(
    node_uuid: str,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific probe node by UUID (admin only).
    This endpoint returns detailed information about a single probe node.
    """
    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    return node


@router.put("/{node_uuid}", response_model=schemas.ProbeNodeResponse)
async def update_node(
    node_uuid: str,
    node_update: schemas.ProbeNodeAdminUpdate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a probe node (admin only).
    This endpoint allows administrators to update configuration and settings for a probe node.
    """
    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Update fields from the request
    update_data = node_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(node, key, value)
    
    node.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(node)
    
    logger.info(f"Probe node updated: {node.name} ({node.node_uuid})")
    
    return node


@router.get("/registration-token", response_model=List[schemas.NodeRegistrationTokenResponse])
async def get_registration_tokens(
    include_expired: bool = Query(False, description="Include expired tokens"),
    include_used: bool = Query(False, description="Include already used tokens"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all registration tokens (admin only).
    This endpoint returns a list of all registration tokens in the system.
    """
    query = db.query(models.NodeRegistrationToken)
    
    # Apply filters
    if not include_expired:
        query = query.filter(models.NodeRegistrationToken.expires_at > datetime.utcnow())
    
    if not include_used:
        query = query.filter(models.NodeRegistrationToken.is_used == False)
    
    # Get results
    tokens = query.order_by(models.NodeRegistrationToken.created_at.desc()).all()
    
    return tokens


@router.get("/registration-token/{token_id}", response_model=schemas.NodeRegistrationTokenResponse)
async def get_registration_token_details(
    token_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific registration token by ID (admin only).
    This endpoint returns detailed information about a single registration token.
    """
    token = db.query(models.NodeRegistrationToken).filter(models.NodeRegistrationToken.id == token_id).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration token not found"
        )
    
    return token


@router.delete("/registration-token/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_registration_token(
    token_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a registration token (admin only).
    This endpoint marks a token as used and expired to prevent its future use.
    """
    token = db.query(models.NodeRegistrationToken).filter(models.NodeRegistrationToken.id == token_id).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration token not found"
        )
    
    # Mark as used and expired
    token.is_used = True
    token.used_at = datetime.utcnow()
    token.expires_at = datetime.utcnow()  # Expire immediately
    
    db.commit()
    
    logger.info(f"Registration token revoked: {token.description} (ID: {token.id})")
    
    return None


@router.post("/registration-token", response_model=Dict[str, Any])
async def create_registration_token(
    description: str = Body(..., embed=True),
    expiry_hours: int = Body(24, embed=True),
    region: Optional[str] = Body(None, embed=True),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new registration token for a probe node (admin only).
    This endpoint generates a token that can be used for the initial registration of a probe node.
    """
    # Generate a secure token
    token_value = f"pnreg_{secrets.token_urlsafe(24)}"
    expires_at = datetime.utcnow() + timedelta(hours=expiry_hours)
    
    # Create token record
    token = models.NodeRegistrationToken(
        token=token_value,
        description=description,
        created_by_user_id=current_user.id,
        expires_at=expires_at,
        intended_region=region
    )
    
    db.add(token)
    db.commit()
    
    logger.info(f"New node registration token created by {current_user.username}, expires {expires_at}")
    
    return {
        "token": token_value,
        "expires_at": expires_at.isoformat(),
        "description": description,
        "message": "Registration token created successfully"
    }


@router.delete("/{node_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_node(
    node_uuid: str,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate a probe node (admin only).
    This endpoint marks a probe node as inactive, preventing it from processing new diagnostics.
    """
    node = db.query(models.ProbeNode).filter(models.ProbeNode.node_uuid == node_uuid).first()
    
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Instead of deleting, just mark as inactive
    node.is_active = False
    node.status = "deactivated"
    node.updated_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Probe node deactivated: {node.name} ({node.node_uuid})")
    
    return None
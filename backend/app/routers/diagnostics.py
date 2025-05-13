from datetime import datetime
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db
from app.diagnostics.tools import run_ping, run_traceroute, run_dns_lookup

router = APIRouter()


@router.get("/api/diagnostics/ping", response_model=schemas.DiagnosticResponse)
async def ping_target(
    target: str = Query(..., description="Hostname or IP address to ping"),
    count: int = Query(4, description="Number of packets to send"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    success, result = run_ping(target, count)
    execution_time = int((time.time() - start_time) * 1000)  # Convert to ms
    
    # Create diagnostic record
    diagnostic = models.Diagnostic(
        tool="ping",
        target=target,
        result=result,
        status="success" if success else "failure",
        user_id=current_user.id,
        execution_time=execution_time
    )
    
    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)
    
    return diagnostic


@router.get("/api/diagnostics/traceroute", response_model=schemas.DiagnosticResponse)
async def traceroute_target(
    target: str = Query(..., description="Hostname or IP address to trace"),
    max_hops: int = Query(30, description="Maximum number of hops"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    success, result = run_traceroute(target, max_hops)
    execution_time = int((time.time() - start_time) * 1000)  # Convert to ms
    
    # Create diagnostic record
    diagnostic = models.Diagnostic(
        tool="traceroute",
        target=target,
        result=result,
        status="success" if success else "failure",
        user_id=current_user.id,
        execution_time=execution_time
    )
    
    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)
    
    return diagnostic


@router.get("/api/diagnostics/dns", response_model=schemas.DiagnosticResponse)
async def dns_lookup(
    target: str = Query(..., description="Hostname to look up"),
    record_type: str = Query("A", description="DNS record type (A, AAAA, MX, etc.)"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    success, result = run_dns_lookup(target, record_type)
    execution_time = int((time.time() - start_time) * 1000)  # Convert to ms
    
    # Create diagnostic record
    diagnostic = models.Diagnostic(
        tool="dns_lookup",
        target=f"{target} ({record_type})",
        result=result,
        status="success" if success else "failure",
        user_id=current_user.id,
        execution_time=execution_time
    )
    
    db.add(diagnostic)
    db.commit()
    db.refresh(diagnostic)
    
    return diagnostic


@router.get("/api/diagnostics/history", response_model=List[schemas.DiagnosticResponse])
async def get_diagnostic_history(
    tool: Optional[str] = Query(None, description="Filter by tool"),
    limit: int = Query(10, description="Maximum number of results to return"),
    skip: int = Query(0, description="Number of results to skip"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Diagnostic).filter(models.Diagnostic.user_id == current_user.id)
    
    if tool:
        query = query.filter(models.Diagnostic.tool == tool)
    
    diagnostics = query.order_by(models.Diagnostic.created_at.desc()).offset(skip).limit(limit).all()
    
    return diagnostics

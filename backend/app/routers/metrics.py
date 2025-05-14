from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Diagnostic, ApiKey, ScheduledProbe, ProbeResult, User
from app import auth

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard metrics for the current user.
    
    Returns aggregated metrics for display on the user dashboard:
    - Total diagnostics run by the user
    - Number of API keys the user has
    - Number of scheduled probes the user has
    - Success rate of diagnostics
    - Average response time of diagnostics
    """
    # Get count of user's diagnostics
    diagnostic_count = db.query(func.count(Diagnostic.id)).filter(
        Diagnostic.user_id == current_user.id
    ).scalar() or 0
    
    # Get count of user's API keys
    api_key_count = db.query(func.count(ApiKey.id)).filter(
        ApiKey.user_id == current_user.id,
        ApiKey.is_active == True
    ).scalar() or 0
    
    # Get count of user's active scheduled probes
    scheduled_probe_count = db.query(func.count(ScheduledProbe.id)).filter(
        ScheduledProbe.user_id == current_user.id,
        ScheduledProbe.is_active == True
    ).scalar() or 0
    
    # Calculate success rate and average response time
    # Get all diagnostics for the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_diagnostics = db.query(Diagnostic).filter(
        Diagnostic.user_id == current_user.id,
        Diagnostic.created_at >= thirty_days_ago
    ).all()
    
    # Calculate success rate
    if recent_diagnostics:
        successful_diagnostics = [d for d in recent_diagnostics if d.status == 'success']
        success_rate = int((len(successful_diagnostics) / len(recent_diagnostics)) * 100)
    else:
        success_rate = 0
    
    # Calculate average response time
    if recent_diagnostics:
        execution_times = [d.execution_time for d in recent_diagnostics if d.execution_time is not None]
        avg_response_time = int(sum(execution_times) / len(execution_times)) if execution_times else 0
    else:
        avg_response_time = 0
    
    # Return the combined metrics
    return {
        "diagnostic_count": diagnostic_count,
        "api_key_count": api_key_count,
        "scheduled_probe_count": scheduled_probe_count,
        "success_rate": success_rate,
        "avg_response_time": avg_response_time
    }


@router.get("/system")
async def get_system_metrics(
    current_user: User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system-wide metrics (admin only).
    
    Returns metrics about the entire system:
    - Total users
    - Total diagnostics
    - Total scheduled probes
    - Overall success rate
    - System health indicators
    """
    # Get total counts
    user_count = db.query(func.count(User.id)).scalar() or 0
    diagnostic_count = db.query(func.count(Diagnostic.id)).scalar() or 0
    scheduled_probe_count = db.query(func.count(ScheduledProbe.id)).scalar() or 0
    
    # Calculate overall success rate
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_diagnostics = db.query(Diagnostic).filter(
        Diagnostic.created_at >= thirty_days_ago
    ).all()
    
    if recent_diagnostics:
        successful_diagnostics = [d for d in recent_diagnostics if d.status == 'success']
        success_rate = int((len(successful_diagnostics) / len(recent_diagnostics)) * 100)
    else:
        success_rate = 0
    
    # Get active users in the last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    active_users = db.query(func.count(func.distinct(Diagnostic.user_id))).filter(
        Diagnostic.created_at >= seven_days_ago
    ).scalar() or 0
    
    # Return the combined metrics
    return {
        "user_count": user_count,
        "active_users": active_users,
        "total_diagnostics": diagnostic_count,
        "total_scheduled_probes": scheduled_probe_count,
        "overall_success_rate": success_rate,
        "system_health": "good"  # Placeholder for real system health monitoring
    }
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter()


@router.post("/probes", response_model=schemas.ScheduledProbeResponse)
async def create_scheduled_probe(
    probe: schemas.ScheduledProbeCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new scheduled probe.
    Validates the user's subscription tier allows scheduled probes.
    """
    # Check user's subscription tier
    user_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == current_user.id,
        models.UserSubscription.is_active == True
    ).first()
    
    if not user_subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required for scheduled probes"
        )
    
    # Get subscription tier
    tier = db.query(models.SubscriptionTier).filter(
        models.SubscriptionTier.id == user_subscription.tier_id
    ).first()
    
    if not tier.allow_scheduled_probes:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier does not allow scheduled probes"
        )
    
    # Check if user has reached their probe limit
    probe_count = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.user_id == current_user.id
    ).count()
    
    if probe_count >= tier.max_scheduled_probes:
        raise HTTPException(
            status_code=403,
            detail=f"Maximum scheduled probes limit reached ({tier.max_scheduled_probes})"
        )
    
    # Check minimum interval based on tier
    # Only Enterprise tier can have intervals below 15 minutes
    if probe.interval_minutes < 15 and not tier.allow_custom_intervals:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier requires a minimum interval of 15 minutes"
        )
    
    # Create the scheduled probe
    db_probe = models.ScheduledProbe(
        name=probe.name,
        description=probe.description,
        tool=probe.tool,
        target=probe.target,
        interval_minutes=probe.interval_minutes,
        is_active=probe.is_active,
        alert_on_failure=probe.alert_on_failure,
        alert_on_threshold=probe.alert_on_threshold,
        threshold_value=probe.threshold_value,
        user_id=current_user.id
    )
    
    db.add(db_probe)
    db.commit()
    db.refresh(db_probe)
    
    return db_probe


@router.get("/probes", response_model=List[schemas.ScheduledProbeResponse])
async def get_scheduled_probes(
    active_only: bool = Query(False, description="Only return active probes"),
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all scheduled probes for the current user.
    """
    query = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.user_id == current_user.id
    )
    
    if active_only:
        query = query.filter(models.ScheduledProbe.is_active == True)
    
    probes = query.order_by(models.ScheduledProbe.created_at.desc()).offset(skip).limit(limit).all()
    
    return probes


@router.get("/probes/{probe_id}", response_model=schemas.ScheduledProbeResponse)
async def get_scheduled_probe(
    probe_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific scheduled probe by ID.
    """
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    return probe


@router.put("/probes/{probe_id}", response_model=schemas.ScheduledProbeResponse)
async def update_scheduled_probe(
    probe_id: int,
    probe_update: schemas.ScheduledProbeCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a specific scheduled probe.
    """
    # Get the user's subscription tier
    user_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == current_user.id,
        models.UserSubscription.is_active == True
    ).first()
    
    if not user_subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required for scheduled probes"
        )
    
    # Get subscription tier
    tier = db.query(models.SubscriptionTier).filter(
        models.SubscriptionTier.id == user_subscription.tier_id
    ).first()
    
    # Check minimum interval based on tier
    if probe_update.interval_minutes < 15 and not tier.allow_custom_intervals:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier requires a minimum interval of 15 minutes"
        )
    
    # Get the existing probe
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    # Update the probe
    probe.name = probe_update.name
    probe.description = probe_update.description
    probe.tool = probe_update.tool
    probe.target = probe_update.target
    probe.interval_minutes = probe_update.interval_minutes
    probe.is_active = probe_update.is_active
    probe.alert_on_failure = probe_update.alert_on_failure
    probe.alert_on_threshold = probe_update.alert_on_threshold
    probe.threshold_value = probe_update.threshold_value
    probe.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(probe)
    
    return probe


@router.delete("/probes/{probe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled_probe(
    probe_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific scheduled probe.
    """
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    db.delete(probe)
    db.commit()
    
    return None


@router.put("/probes/{probe_id}/pause", response_model=schemas.ScheduledProbeResponse)
async def pause_scheduled_probe(
    probe_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Pause a specific scheduled probe.
    """
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    probe.is_active = False
    probe.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(probe)
    
    return probe


@router.put("/probes/{probe_id}/resume", response_model=schemas.ScheduledProbeResponse)
async def resume_scheduled_probe(
    probe_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Resume a specific scheduled probe.
    """
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    probe.is_active = True
    probe.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(probe)
    
    return probe


@router.get("/probes/{probe_id}/results", response_model=List[schemas.ProbeResultResponse])
async def get_probe_results(
    probe_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(50, description="Maximum number of items to return"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get results for a specific scheduled probe.
    """
    # Verify the probe exists and belongs to the user
    probe = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id == probe_id,
        models.ScheduledProbe.user_id == current_user.id
    ).first()
    
    if not probe:
        raise HTTPException(
            status_code=404,
            detail="Scheduled probe not found"
        )
    
    # Get the results
    results = db.query(models.ProbeResult).filter(
        models.ProbeResult.scheduled_probe_id == probe_id
    ).order_by(models.ProbeResult.created_at.desc()).offset(skip).limit(limit).all()
    
    return results


@router.post("/probes/bulk-pause", response_model=dict)
async def bulk_pause_probes(
    probe_ids: List[int],
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Pause multiple scheduled probes at once.
    Requires Standard or Enterprise subscription.
    """
    # Check user's subscription tier
    user_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == current_user.id,
        models.UserSubscription.is_active == True
    ).first()
    
    if not user_subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required for bulk operations"
        )
    
    # Get subscription tier
    tier = db.query(models.SubscriptionTier).filter(
        models.SubscriptionTier.id == user_subscription.tier_id
    ).first()
    
    # Only allow bulk operations for Standard and Enterprise tiers (they have allow_export flag)
    if not tier.allow_export:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier does not allow bulk operations"
        )
    
    # Update the probes
    updated_count = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id.in_(probe_ids),
        models.ScheduledProbe.user_id == current_user.id
    ).update({"is_active": False, "updated_at": datetime.utcnow()})
    
    db.commit()
    
    return {"paused_count": updated_count}


@router.post("/probes/bulk-resume", response_model=dict)
async def bulk_resume_probes(
    probe_ids: List[int],
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Resume multiple scheduled probes at once.
    Requires Standard or Enterprise subscription.
    """
    # Check user's subscription tier
    user_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == current_user.id,
        models.UserSubscription.is_active == True
    ).first()
    
    if not user_subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required for bulk operations"
        )
    
    # Get subscription tier
    tier = db.query(models.SubscriptionTier).filter(
        models.SubscriptionTier.id == user_subscription.tier_id
    ).first()
    
    # Only allow bulk operations for Standard and Enterprise tiers (they have allow_export flag)
    if not tier.allow_export:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier does not allow bulk operations"
        )
    
    # Update the probes
    updated_count = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id.in_(probe_ids),
        models.ScheduledProbe.user_id == current_user.id
    ).update({"is_active": True, "updated_at": datetime.utcnow()})
    
    db.commit()
    
    return {"resumed_count": updated_count}


@router.post("/probes/bulk-delete", response_model=dict)
async def bulk_delete_probes(
    probe_ids: List[int],
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete multiple scheduled probes at once.
    Requires Standard or Enterprise subscription.
    """
    # Check user's subscription tier
    user_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == current_user.id,
        models.UserSubscription.is_active == True
    ).first()
    
    if not user_subscription:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required for bulk operations"
        )
    
    # Get subscription tier
    tier = db.query(models.SubscriptionTier).filter(
        models.SubscriptionTier.id == user_subscription.tier_id
    ).first()
    
    # Only allow bulk operations for Standard and Enterprise tiers (they have allow_export flag)
    if not tier.allow_export:
        raise HTTPException(
            status_code=403,
            detail="Your subscription tier does not allow bulk operations"
        )
    
    # Delete the probes
    probes_to_delete = db.query(models.ScheduledProbe).filter(
        models.ScheduledProbe.id.in_(probe_ids),
        models.ScheduledProbe.user_id == current_user.id
    ).all()
    
    deleted_count = len(probes_to_delete)
    
    for probe in probes_to_delete:
        db.delete(probe)
    
    db.commit()
    
    return {"deleted_count": deleted_count}
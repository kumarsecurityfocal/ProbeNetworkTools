from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter()


@router.post("/subscriptions", response_model=schemas.UserSubscriptionResponse)
def create_subscription(
    subscription: schemas.UserSubscriptionCreate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new subscription for a user (admin only).
    """
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == subscription.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if subscription tier exists
    tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.id == subscription.tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Subscription tier not found")
    
    # Check if user already has a subscription
    existing_subscription = db.query(models.UserSubscription).filter(
        models.UserSubscription.user_id == subscription.user_id
    ).first()
    
    if existing_subscription:
        # Update existing subscription
        for key, value in subscription.dict().items():
            setattr(existing_subscription, key, value)
        db.commit()
        db.refresh(existing_subscription)
        return existing_subscription
    
    # Create new subscription
    db_subscription = models.UserSubscription(**subscription.dict())
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription


@router.get("/subscriptions", response_model=List[schemas.UserSubscriptionResponse])
def list_subscriptions(
    current_user: models.User = Depends(auth.get_admin_user),
    skip: int = 0,
    limit: int = 100,
    active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    List all subscriptions (admin only).
    """
    query = db.query(models.UserSubscription)
    
    if active is not None:
        query = query.filter(models.UserSubscription.is_active == active)
    
    subscriptions = query.offset(skip).limit(limit).all()
    return subscriptions


@router.get("/subscriptions/{subscription_id}", response_model=schemas.UserSubscriptionResponse)
def get_subscription(
    subscription_id: int = Path(..., title="The ID of the subscription to get"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get a subscription by ID (admin only).
    """
    subscription = db.query(models.UserSubscription).filter(models.UserSubscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription


@router.put("/subscriptions/{subscription_id}", response_model=schemas.UserSubscriptionResponse)
def update_subscription(
    subscription_data: schemas.UserSubscriptionCreate,
    subscription_id: int = Path(..., title="The ID of the subscription to update"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a subscription (admin only).
    """
    subscription = db.query(models.UserSubscription).filter(models.UserSubscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    for key, value in subscription_data.dict().items():
        setattr(subscription, key, value)
    
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/subscriptions/{subscription_id}/cancel", response_model=schemas.UserSubscriptionResponse)
def cancel_subscription(
    subscription_id: int = Path(..., title="The ID of the subscription to cancel"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a subscription (admin only).
    """
    subscription = db.query(models.UserSubscription).filter(models.UserSubscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    subscription.is_active = False
    subscription.expires_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/subscriptions/{subscription_id}/renew", response_model=schemas.UserSubscriptionResponse)
def renew_subscription(
    months: int = Query(1, ge=1, le=12, description="Number of months to renew"),
    subscription_id: int = Path(..., title="The ID of the subscription to renew"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Renew a subscription (admin only).
    """
    subscription = db.query(models.UserSubscription).filter(models.UserSubscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Calculate new expiration date
    if subscription.expires_at and subscription.expires_at > datetime.utcnow():
        # Extend from current expiration date
        subscription.expires_at = subscription.expires_at + timedelta(days=30 * months)
    else:
        # Start fresh from now
        subscription.expires_at = datetime.utcnow() + timedelta(days=30 * months)
    
    subscription.is_active = True
    
    db.commit()
    db.refresh(subscription)
    return subscription


@router.get("/subscription-tiers", response_model=List[schemas.SubscriptionTierResponse])
def list_subscription_tiers(db: Session = Depends(get_db)):
    """
    List all subscription tiers. Public endpoint.
    """
    tiers = db.query(models.SubscriptionTier).all()
    return tiers


@router.get("/subscription-tiers/{tier_id}", response_model=schemas.SubscriptionTierResponse)
def get_subscription_tier(
    tier_id: int = Path(..., title="The ID of the subscription tier to get"),
    db: Session = Depends(get_db)
):
    """
    Get a subscription tier by ID. Public endpoint.
    """
    tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Subscription tier not found")
    return tier


@router.post("/subscription-tiers", response_model=schemas.SubscriptionTierResponse)
def create_subscription_tier(
    tier: schemas.SubscriptionTierCreate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new subscription tier (admin only).
    """
    # Check if a tier with this name already exists
    existing_tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.name == tier.name).first()
    if existing_tier:
        raise HTTPException(status_code=400, detail="A subscription tier with this name already exists")
    
    # Create new tier
    db_tier = models.SubscriptionTier(**tier.dict())
    db.add(db_tier)
    db.commit()
    db.refresh(db_tier)
    return db_tier


@router.put("/subscription-tiers/{tier_id}", response_model=schemas.SubscriptionTierResponse)
def update_subscription_tier(
    tier_data: schemas.SubscriptionTierCreate,
    tier_id: int = Path(..., title="The ID of the subscription tier to update"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a subscription tier (admin only).
    """
    tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Subscription tier not found")
    
    # Check if renaming would cause a conflict
    if tier_data.name != tier.name:
        existing_tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.name == tier_data.name).first()
        if existing_tier:
            raise HTTPException(status_code=400, detail="A subscription tier with this name already exists")
    
    # Update tier attributes
    for key, value in tier_data.dict().items():
        setattr(tier, key, value)
    
    db.commit()
    db.refresh(tier)
    return tier


@router.delete("/subscription-tiers/{tier_id}", response_model=dict)
def delete_subscription_tier(
    tier_id: int = Path(..., title="The ID of the subscription tier to delete"),
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a subscription tier (admin only).
    
    This will fail if there are any user subscriptions using this tier.
    """
    tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Subscription tier not found")
    
    # Check if there are any subscriptions using this tier
    subscriptions = db.query(models.UserSubscription).filter(models.UserSubscription.tier_id == tier_id).count()
    if subscriptions > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete tier: {subscriptions} active subscriptions are using this tier"
        )
    
    # Delete the tier
    db.delete(tier)
    db.commit()
    
    return {"detail": f"Subscription tier {tier.name} deleted successfully"}
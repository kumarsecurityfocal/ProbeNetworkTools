import logging
from sqlalchemy.orm import Session

from .database import get_db
from .initialize_tiers import initialize_tiers_if_needed
from .auth import initialize_default_users
from .models import UserSubscription, SubscriptionTier, User

logger = logging.getLogger(__name__)

def assign_default_subscriptions(db: Session):
    """Assign default FREE subscriptions to users who don't have one."""
    # Get the FREE tier
    free_tier = db.query(SubscriptionTier).filter(SubscriptionTier.name == "FREE").first()
    if not free_tier:
        logger.warning("FREE tier not found, unable to assign default subscriptions")
        return False
    
    # Find users without subscriptions
    users_without_subscriptions = db.query(User).outerjoin(
        UserSubscription, User.id == UserSubscription.user_id
    ).filter(UserSubscription.id == None).all()
    
    # Assign free tier to each user without a subscription
    for user in users_without_subscriptions:
        logger.info(f"Assigning FREE tier to user: {user.email}")
        subscription = UserSubscription(
            user_id=user.id,
            tier_id=free_tier.id,
            is_active=True
        )
        db.add(subscription)
    
    if users_without_subscriptions:
        db.commit()
        return True
    
    return False

def initialize_database():
    """Run all database initialization functions."""
    db = next(get_db())
    
    # Initialize subscription tiers
    tiers_initialized = initialize_tiers_if_needed()
    
    # Initialize default users
    users_initialized = initialize_default_users(db)
    
    # Assign default subscriptions
    subscriptions_assigned = assign_default_subscriptions(db)
    
    return {
        "tiers_initialized": tiers_initialized,
        "users_initialized": users_initialized,
        "subscriptions_assigned": subscriptions_assigned
    }
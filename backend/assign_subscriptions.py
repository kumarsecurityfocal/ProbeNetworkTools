"""
Assign default subscriptions to users.
This script ensures all users have at least a FREE subscription.
"""

from datetime import datetime, timedelta
import sys
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Import app modules
from app.database import get_db
from app.models import User, UserSubscription, SubscriptionTier

def assign_default_subscriptions():
    """Assign the FREE subscription tier to users who don't have a subscription."""
    logger.info("Assigning default FREE subscriptions to users...")
    
    # Get a DB session
    db = next(get_db())
    
    try:
        # Get the FREE tier
        free_tier = db.query(SubscriptionTier).filter(SubscriptionTier.name == "FREE").first()
        
        if not free_tier:
            logger.error("FREE tier not found in the database.")
            return "Error: FREE tier not found"
        
        # Get all users without a subscription
        users_without_subscription = db.query(User).outerjoin(
            UserSubscription, User.id == UserSubscription.user_id
        ).filter(UserSubscription.id == None).all()
        
        if not users_without_subscription:
            logger.info("All users already have a subscription.")
            return "All users already have a subscription"
        
        logger.info(f"Found {len(users_without_subscription)} users without a subscription.")
        
        # Create a default subscription for each user
        for user in users_without_subscription:
            logger.info(f"Creating FREE subscription for user: {user.email}")
            
            # One year from now
            expiry_date = datetime.utcnow() + timedelta(days=365)
            
            subscription = UserSubscription(
                user_id=user.id,
                tier_id=free_tier.id,
                is_active=True,
                starts_at=datetime.utcnow(),
                expires_at=expiry_date
            )
            
            db.add(subscription)
        
        db.commit()
        logger.info(f"Successfully assigned FREE subscriptions to {len(users_without_subscription)} users.")
        return f"Assigned FREE subscriptions to {len(users_without_subscription)} users"
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning default subscriptions: {str(e)}")
        return f"Error: {str(e)}"
    finally:
        db.close()

def main():
    """Main function."""
    print("\nAssigning default subscriptions to users...\n")
    result = assign_default_subscriptions()
    print(f"Result: {result}")
    print("\nDone!\n")

if __name__ == "__main__":
    main()
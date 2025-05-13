"""
View the users in the database.
This script is intended to be run directly to check the current users.
"""

import sys
import os

# Import app modules
from app.database import get_db
from app.models import User, UserSubscription

def main():
    """View the users in the database."""
    print("\nViewing users in the database...\n")
    
    # Get a DB session
    db = next(get_db())
    
    try:
        # Get all users
        users = db.query(User).all()
        
        if not users:
            print("No users found in the database.")
            return
        
        print(f"Found {len(users)} users:")
        print("-" * 80)
        
        for user in users:
            print(f"ID: {user.id}")
            print(f"Username: {user.username}")
            print(f"Email: {user.email}")
            print(f"Is Admin: {user.is_admin}")
            print(f"Is Active: {user.is_active}")
            print(f"Email Verified: {user.email_verified}")
            print(f"Created At: {user.created_at}")
            
            # Get user subscription
            subscription = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
            if subscription:
                print(f"Subscription Tier ID: {subscription.tier_id}")
                print(f"Subscription Active: {subscription.is_active}")
                print(f"Subscription Starts: {subscription.starts_at}")
                print(f"Subscription Expires: {subscription.expires_at}")
            else:
                print("No subscription found for this user.")
            
            print("-" * 80)
    
    except Exception as e:
        print(f"Error viewing users: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
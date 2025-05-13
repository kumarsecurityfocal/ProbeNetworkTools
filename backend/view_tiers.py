"""
View the subscription tiers in the database.
This script is intended to be run directly to check the current subscription tiers.
"""

import sys
import os
from pprint import pprint

# Import app modules
from app.database import get_db
from app.models import SubscriptionTier

def main():
    """View the subscription tiers in the database."""
    print("\nViewing subscription tiers in the database...\n")
    
    # Get a DB session
    db = next(get_db())
    
    try:
        # Get all subscription tiers
        tiers = db.query(SubscriptionTier).all()
        
        if not tiers:
            print("No subscription tiers found in the database.")
            return
        
        print(f"Found {len(tiers)} subscription tiers:")
        print("-" * 80)
        
        for tier in tiers:
            print(f"ID: {tier.id}")
            print(f"Name: {tier.name}")
            print(f"Description: {tier.description}")
            print(f"Price Monthly: ${tier.price_monthly/100:.2f}")
            print(f"Price Yearly: ${tier.price_yearly/100:.2f}")
            print(f"Features:")
            for feature, value in tier.features.items():
                print(f"  - {feature}: {value}")
            print("-" * 80)
    
    except Exception as e:
        print(f"Error viewing subscription tiers: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
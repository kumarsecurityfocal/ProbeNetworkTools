from sqlalchemy.orm import Session
import json
from .models import SubscriptionTier
from .database import get_db
from fastapi import Depends


def create_subscription_tier(
    db: Session,
    name: str,
    description: str,
    price_monthly: int,
    price_yearly: int,
    rate_limit_minute: int,
    rate_limit_hour: int,
    max_scheduled_probes: int,
    max_api_keys: int,
    max_history_days: int,
    allow_scheduled_probes: bool,
    allow_api_access: bool,
    allow_export: bool,
    allow_alerts: bool,
    allow_custom_intervals: bool,
    priority_support: bool,
    features: dict
):
    """
    Create a subscription tier if it doesn't exist.
    Returns the tier (either existing or newly created).
    """
    db_tier = db.query(SubscriptionTier).filter(SubscriptionTier.name == name).first()
    
    if db_tier:
        return db_tier
        
    db_tier = SubscriptionTier(
        name=name,
        description=description,
        price_monthly=price_monthly,
        price_yearly=price_yearly,
        rate_limit_minute=rate_limit_minute,
        rate_limit_hour=rate_limit_hour,
        max_scheduled_probes=max_scheduled_probes,
        max_api_keys=max_api_keys,
        max_history_days=max_history_days,
        allow_scheduled_probes=allow_scheduled_probes,
        allow_api_access=allow_api_access,
        allow_export=allow_export,
        allow_alerts=allow_alerts,
        allow_custom_intervals=allow_custom_intervals,
        priority_support=priority_support,
        features=features
    )
    
    db.add(db_tier)
    db.commit()
    db.refresh(db_tier)
    return db_tier


def initialize_subscription_tiers(db: Session):
    """Initialize the default subscription tiers."""
    
    # Features for each tier
    free_features = {
        "Basic ping diagnostics": True,
        "Basic DNS lookups": True,
        "Traceroute": True,
        "History retention": "7 days",
        "API access": False,
        "Scheduled probes": False,
        "Export capabilities": False,
        "Alerting": False,
        "Max API calls": "10/min, 100/hour",
        "Support": "Community"
    }
    
    standard_features = {
        "Basic ping diagnostics": True,
        "Basic DNS lookups": True,
        "Traceroute": True,
        "Port scanning": True,
        "HTTP endpoint testing": True,
        "WHOIS lookups": True,
        "History retention": "30 days",
        "API access": True,
        "Scheduled probes": True,
        "Export capabilities": True,
        "Alerting": True,
        "Max API calls": "30/min, 500/hour",
        "Custom monitoring intervals": False,
        "Support": "Email support"
    }
    
    enterprise_features = {
        "Basic ping diagnostics": True,
        "Basic DNS lookups": True,
        "Traceroute": True,
        "Port scanning": True,
        "HTTP endpoint testing": True,
        "WHOIS lookups": True,
        "SSL certificate analysis": True,
        "Advanced network path analysis": True,
        "History retention": "90 days",
        "API access": True,
        "Scheduled probes": True,
        "Export capabilities": True,
        "Alerting": True,
        "Max API calls": "Unlimited",
        "Custom monitoring intervals": True,
        "Priority support": True,
        "Support": "Priority 24/7 support"
    }
    
    # Create the tiers
    create_subscription_tier(
        db=db,
        name="FREE",
        description="Basic network diagnostics for personal use",
        price_monthly=0,
        price_yearly=0,
        rate_limit_minute=10,
        rate_limit_hour=100,
        max_scheduled_probes=0,
        max_api_keys=0,
        max_history_days=7,
        allow_scheduled_probes=False,
        allow_api_access=False,
        allow_export=False,
        allow_alerts=False,
        allow_custom_intervals=False,
        priority_support=False,
        features=free_features
    )
    
    create_subscription_tier(
        db=db,
        name="STANDARD",
        description="Advanced diagnostics for professionals and small teams",
        price_monthly=1999,  # $19.99
        price_yearly=19990,  # $199.90 (2 months free)
        rate_limit_minute=30,
        rate_limit_hour=500,
        max_scheduled_probes=10,
        max_api_keys=3,
        max_history_days=30,
        allow_scheduled_probes=True,
        allow_api_access=True,
        allow_export=True,
        allow_alerts=True,
        allow_custom_intervals=False,
        priority_support=False,
        features=standard_features
    )
    
    create_subscription_tier(
        db=db,
        name="ENTERPRISE",
        description="Comprehensive network monitoring for large organizations",
        price_monthly=9999,  # $99.99
        price_yearly=99990,  # $999.90 (2 months free)
        rate_limit_minute=100,
        rate_limit_hour=2000,
        max_scheduled_probes=100,
        max_api_keys=10,
        max_history_days=90,
        allow_scheduled_probes=True,
        allow_api_access=True,
        allow_export=True,
        allow_alerts=True,
        allow_custom_intervals=True,
        priority_support=True,
        features=enterprise_features
    )
    
    return "Subscription tiers initialized successfully"


def initialize_tiers_if_needed():
    """Initialize tiers if they don't exist."""
    db = next(get_db())
    tier_count = db.query(SubscriptionTier).count()
    
    if tier_count == 0:
        initialize_subscription_tiers(db)
        return True
    
    return False